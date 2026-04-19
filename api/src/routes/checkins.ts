import { Hono } from "hono";
import { eq, and, isNull, count, sql, desc, inArray } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { checkIns, users, courts } from "../db/schema";
import { logAudit } from "../lib/audit";
import { getPaginationParams, getOffset, generateId, getClientIp } from "../lib/helpers";
import { authMiddleware, requireRole } from "../middleware/auth";

const checkInsRoute = new Hono<Env>();

checkInsRoute.use("/*", authMiddleware);

// List all check-ins (paginated, filterable by status)
checkInsRoute.get("/", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const url = new URL(c.req.url);
  const { page, limit } = getPaginationParams(url);
  const offset = getOffset({ page, limit });
  const status = url.searchParams.get("status");

  const conditions = [isNull(checkIns.deletedAt)];
  if (status) {
    conditions.push(eq(checkIns.status, status as "pending" | "approved" | "rejected"));
  }

  const where = and(...conditions);

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: checkIns.id,
        customerPhoneNumber: checkIns.customerPhoneNumber,
        sportType: checkIns.sportType,
        courtsBooked: checkIns.courtsBooked,
        pointsEarned: checkIns.pointsEarned,
        status: checkIns.status,
        processedBy: checkIns.processedBy,
        processedAt: checkIns.processedAt,
        rejectionReason: checkIns.rejectionReason,
        createdAt: checkIns.createdAt,
      })
      .from(checkIns)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(checkIns.createdAt)),
    db.select({ total: count() }).from(checkIns).where(where),
  ]);

  // Enrich with customer names
  const phoneNumbers = [...new Set(data.map((d) => d.customerPhoneNumber))];
  let customerMap: Record<string, string> = {};
  if (phoneNumbers.length > 0) {
    const customers = await db
      .select({ phoneNumber: users.phoneNumber, name: users.name })
      .from(users)
      .where(inArray(users.phoneNumber, phoneNumbers));
    customerMap = Object.fromEntries(customers.map((c) => [c.phoneNumber, c.name]));
  }

  const enriched = data.map((d) => ({
    ...d,
    courtsBooked: JSON.parse(d.courtsBooked),
    customerName: customerMap[d.customerPhoneNumber] || "Unknown",
  }));

  return c.json({ checkins: enriched, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Get customer's check-in history
checkInsRoute.get("/customer/:phoneNumber", async (c) => {
  const db = getDb(c.env.DB);
  const phoneNumber = c.req.param("phoneNumber");
  const currentUser = c.get("user");
  const url = new URL(c.req.url);
  const { page, limit } = getPaginationParams(url);
  const offset = getOffset({ page, limit });

  // Customers can only see their own
  if (currentUser.role === "customer" && currentUser.phoneNumber !== phoneNumber) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const where = and(
    eq(checkIns.customerPhoneNumber, phoneNumber),
    isNull(checkIns.deletedAt)
  );

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(checkIns)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(checkIns.createdAt)),
    db.select({ total: count() }).from(checkIns).where(where),
  ]);

  // Get customer points info
  const [customer] = await db
    .select({ currentPoints: users.currentPoints, totalPoints: users.totalPoints })
    .from(users)
    .where(eq(users.phoneNumber, phoneNumber))
    .limit(1);

  return c.json({
    checkins: data.map((d) => ({ ...d, courtsBooked: JSON.parse(d.courtsBooked) })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    currentPoints: customer?.currentPoints ?? 0,
    totalPoints: customer?.totalPoints ?? 0,
  });
});

// Create pending check-in
checkInsRoute.post("/", async (c) => {
  const db = getDb(c.env.DB);
  const currentUser = c.get("user");
  const body = await c.req.json<{
    customerPhoneNumber?: string;
    sportType: string;
    courtsBooked: Array<{ courtId: string; courtName?: string; hours: number }>;
  }>();

  // Determine the customer phone number
  let customerPhone: string;
  if (currentUser.role === "customer") {
    customerPhone = currentUser.phoneNumber;
  } else if (body.customerPhoneNumber) {
    customerPhone = body.customerPhoneNumber;
  } else {
    return c.json({ error: "Customer phone number is required" }, 400);
  }

  // Validate inputs
  if (!body.sportType || !body.courtsBooked || body.courtsBooked.length === 0) {
    return c.json({ error: "Sport type and courts are required" }, 400);
  }

  // Validate courts exist and match sport type
  const courtIds = body.courtsBooked.map((c) => c.courtId);
  const courtRecords = await db
    .select()
    .from(courts)
    .where(and(inArray(courts.id, courtIds), eq(courts.isActive, 1)));

  if (courtRecords.length !== courtIds.length) {
    return c.json({ error: "One or more courts are invalid or inactive" }, 400);
  }

  for (const court of courtRecords) {
    if (court.sportType !== body.sportType) {
      return c.json({
        error: `Court "${court.name}" is not a ${body.sportType} court`,
      }, 400);
    }
  }

  // Validate hours
  for (const courtBooking of body.courtsBooked) {
    if (!courtBooking.hours || courtBooking.hours <= 0 || courtBooking.hours > 24) {
      return c.json({ error: "Hours must be between 1 and 24" }, 400);
    }
  }

  // Verify customer exists
  const [customer] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.phoneNumber, customerPhone),
        eq(users.role, "customer"),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  if (!customer) {
    return c.json({ error: "Customer not found" }, 404);
  }

  // Build courts booked JSON with names
  const courtMap = Object.fromEntries(courtRecords.map((c) => [c.id, c.name]));
  const courtsBooked = body.courtsBooked.map((c) => ({
    courtId: c.courtId,
    courtName: courtMap[c.courtId],
    hours: c.hours,
  }));

  // Calculate points: sum of all hours
  const pointsEarned = body.courtsBooked.reduce((sum, c) => sum + c.hours, 0);

  const id = generateId();
  await db.insert(checkIns).values({
    id,
    customerPhoneNumber: customerPhone,
    sportType: body.sportType,
    courtsBooked: JSON.stringify(courtsBooked),
    pointsEarned,
    status: "pending",
    createdAt: Date.now(),
  });

  await logAudit(db, {
    action: "checkin_requested",
    details: {
      checkInId: id,
      customerPhone,
      sportType: body.sportType,
      courtsBooked,
      pointsEarned,
    },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ id, pointsEarned, status: "pending" }, 201);
});

// Approve check-in
checkInsRoute.post("/:id/approve", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const currentUser = c.get("user");

  const [checkIn] = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.id, id), isNull(checkIns.deletedAt)))
    .limit(1);

  if (!checkIn) {
    return c.json({ error: "Check-in not found" }, 404);
  }

  if (checkIn.status !== "pending") {
    return c.json({ error: "Check-in is not pending" }, 400);
  }

  // Approve the check-in
  await db
    .update(checkIns)
    .set({
      status: "approved",
      processedBy: currentUser.id,
      processedAt: Date.now(),
    })
    .where(eq(checkIns.id, id));

  // Credit points to customer
  await db
    .update(users)
    .set({
      currentPoints: sql`${users.currentPoints} + ${checkIn.pointsEarned}`,
      totalPoints: sql`${users.totalPoints} + ${checkIn.pointsEarned}`,
    })
    .where(eq(users.phoneNumber, checkIn.customerPhoneNumber));

  await logAudit(db, {
    action: "checkin_approved",
    details: {
      checkInId: id,
      customerPhone: checkIn.customerPhoneNumber,
      pointsEarned: checkIn.pointsEarned,
    },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true, pointsEarned: checkIn.pointsEarned });
});

// Reject check-in
checkInsRoute.post("/:id/reject", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const currentUser = c.get("user");
  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));

  const [checkIn] = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.id, id), isNull(checkIns.deletedAt)))
    .limit(1);

  if (!checkIn) {
    return c.json({ error: "Check-in not found" }, 404);
  }

  if (checkIn.status !== "pending") {
    return c.json({ error: "Check-in is not pending" }, 400);
  }

  await db
    .update(checkIns)
    .set({
      status: "rejected",
      processedBy: currentUser.id,
      processedAt: Date.now(),
      rejectionReason: body.reason || null,
    })
    .where(eq(checkIns.id, id));

  await logAudit(db, {
    action: "checkin_rejected",
    details: {
      checkInId: id,
      customerPhone: checkIn.customerPhoneNumber,
      reason: body.reason,
    },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true });
});

export default checkInsRoute;
