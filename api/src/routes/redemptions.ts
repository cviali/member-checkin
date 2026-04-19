import { Hono } from "hono";
import { eq, and, isNull, count, sql, desc, inArray } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { redemptions, rewards, users } from "../db/schema";
import { logAudit } from "../lib/audit";
import { getPaginationParams, getOffset, generateId, getClientIp } from "../lib/helpers";
import { authMiddleware, requireRole } from "../middleware/auth";

const redemptionsRoute = new Hono<Env>();

redemptionsRoute.use("/*", authMiddleware);

// List all redemptions (staff)
redemptionsRoute.get("/", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const url = new URL(c.req.url);
  const { page, limit } = getPaginationParams(url);
  const offset = getOffset({ page, limit });
  const status = url.searchParams.get("status");

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) {
    conditions.push(eq(redemptions.status, status as "pending" | "approved" | "rejected"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(redemptions)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(redemptions.requestedAt)),
    db.select({ total: count() }).from(redemptions).where(where),
  ]);

  // Enrich with customer names and reward names
  const phoneNumbers = [...new Set(data.map((d) => d.customerPhoneNumber))];
  const rewardIds = [...new Set(data.map((d) => d.rewardId))];

  let customerMap: Record<string, string> = {};
  let rewardMap: Record<string, string> = {};

  if (phoneNumbers.length > 0) {
    const customers = await db
      .select({ phoneNumber: users.phoneNumber, name: users.name })
      .from(users)
      .where(inArray(users.phoneNumber, phoneNumbers));
    customerMap = Object.fromEntries(customers.map((c) => [c.phoneNumber, c.name]));
  }

  if (rewardIds.length > 0) {
    const rewardRecords = await db
      .select({ id: rewards.id, name: rewards.name, imageUrl: rewards.imageUrl, pointsRequired: rewards.pointsRequired })
      .from(rewards)
      .where(inArray(rewards.id, rewardIds));
    rewardMap = Object.fromEntries(rewardRecords.map((r) => [r.id, r.name]));
  }

  const enriched = data.map((d) => ({
    ...d,
    customerName: customerMap[d.customerPhoneNumber] || "Unknown",
    rewardName: rewardMap[d.rewardId] || "Unknown",
  }));

  return c.json({ redemptions: enriched, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Customer's own redemption history
redemptionsRoute.get("/customer", async (c) => {
  const db = getDb(c.env.DB);
  const currentUser = c.get("user");
  const url = new URL(c.req.url);
  const { page, limit } = getPaginationParams(url);
  const offset = getOffset({ page, limit });

  if (currentUser.role !== "customer") {
    return c.json({ error: "Customer access only" }, 403);
  }

  const where = eq(redemptions.customerPhoneNumber, currentUser.phoneNumber);

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(redemptions)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(redemptions.requestedAt)),
    db.select({ total: count() }).from(redemptions).where(where),
  ]);

  // Enrich with reward names
  const rewardIds = [...new Set(data.map((d) => d.rewardId))];
  let rewardDetails: Record<string, { name: string; imageUrl: string | null }> = {};

  if (rewardIds.length > 0) {
    const rewardRecords = await db
      .select({ id: rewards.id, name: rewards.name, imageUrl: rewards.imageUrl })
      .from(rewards)
      .where(inArray(rewards.id, rewardIds));
    rewardDetails = Object.fromEntries(
      rewardRecords.map((r) => [r.id, { name: r.name, imageUrl: r.imageUrl }])
    );
  }

  const enriched = data.map((d) => ({
    ...d,
    rewardName: rewardDetails[d.rewardId]?.name || "Unknown",
    rewardImageUrl: rewardDetails[d.rewardId]?.imageUrl || null,
  }));

  return c.json({ redemptions: enriched, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Submit redemption request (customer)
redemptionsRoute.post("/", async (c) => {
  const db = getDb(c.env.DB);
  const currentUser = c.get("user");
  const body = await c.req.json<{ rewardId: string }>();

  if (currentUser.role !== "customer") {
    return c.json({ error: "Only customers can request redemptions" }, 403);
  }

  if (!body.rewardId) {
    return c.json({ error: "Reward ID is required" }, 400);
  }

  // Get reward
  const [reward] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, body.rewardId), eq(rewards.isActive, 1), isNull(rewards.deletedAt)))
    .limit(1);

  if (!reward) {
    return c.json({ error: "Reward not found or inactive" }, 404);
  }

  // Get customer current points
  const [customer] = await db
    .select({ currentPoints: users.currentPoints })
    .from(users)
    .where(eq(users.phoneNumber, currentUser.phoneNumber))
    .limit(1);

  if (!customer || customer.currentPoints < reward.pointsRequired) {
    return c.json({ error: "Insufficient points" }, 400);
  }

  const id = generateId();

  // Create redemption and deduct points optimistically
  await db.insert(redemptions).values({
    id,
    rewardId: body.rewardId,
    customerPhoneNumber: currentUser.phoneNumber,
    pointsSpent: reward.pointsRequired,
    status: "pending",
    requestedAt: Date.now(),
  });

  await db
    .update(users)
    .set({
      currentPoints: sql`${users.currentPoints} - ${reward.pointsRequired}`,
    })
    .where(eq(users.phoneNumber, currentUser.phoneNumber));

  await logAudit(db, {
    action: "redemption_requested",
    details: {
      redemptionId: id,
      rewardId: body.rewardId,
      rewardName: reward.name,
      pointsSpent: reward.pointsRequired,
    },
    userId: currentUser.id,
    username: currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ id, pointsSpent: reward.pointsRequired, status: "pending" }, 201);
});

// Approve redemption (staff)
redemptionsRoute.post("/:id/approve", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const currentUser = c.get("user");

  const [redemption] = await db
    .select()
    .from(redemptions)
    .where(eq(redemptions.id, id))
    .limit(1);

  if (!redemption) {
    return c.json({ error: "Redemption not found" }, 404);
  }

  if (redemption.status !== "pending") {
    return c.json({ error: "Redemption is not pending" }, 400);
  }

  await db
    .update(redemptions)
    .set({
      status: "approved",
      processedBy: currentUser.id,
      processedAt: Date.now(),
    })
    .where(eq(redemptions.id, id));

  await logAudit(db, {
    action: "redemption_approved",
    details: {
      redemptionId: id,
      customerPhone: redemption.customerPhoneNumber,
      pointsSpent: redemption.pointsSpent,
    },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true });
});

// Reject redemption (staff) — refund points
redemptionsRoute.post("/:id/reject", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const currentUser = c.get("user");
  const body = await c.req.json<{ notes?: string }>().catch(() => ({ notes: undefined }));

  const [redemption] = await db
    .select()
    .from(redemptions)
    .where(eq(redemptions.id, id))
    .limit(1);

  if (!redemption) {
    return c.json({ error: "Redemption not found" }, 404);
  }

  if (redemption.status !== "pending") {
    return c.json({ error: "Redemption is not pending" }, 400);
  }

  // Reject and refund points
  await db
    .update(redemptions)
    .set({
      status: "rejected",
      processedBy: currentUser.id,
      processedAt: Date.now(),
      notes: body.notes || null,
    })
    .where(eq(redemptions.id, id));

  await db
    .update(users)
    .set({
      currentPoints: sql`${users.currentPoints} + ${redemption.pointsSpent}`,
    })
    .where(eq(users.phoneNumber, redemption.customerPhoneNumber));

  await logAudit(db, {
    action: "redemption_rejected",
    details: {
      redemptionId: id,
      customerPhone: redemption.customerPhoneNumber,
      pointsRefunded: redemption.pointsSpent,
      notes: body.notes,
    },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true, pointsRefunded: redemption.pointsSpent });
});

export default redemptionsRoute;
