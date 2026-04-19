import { Hono } from "hono";
import { eq, and, isNull, like, or, sql, count } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { users } from "../db/schema";
import { hashPassword } from "../lib/crypto";
import { logAudit } from "../lib/audit";
import { getPaginationParams, getOffset, generateId, getClientIp } from "../lib/helpers";
import { authMiddleware, requireRole } from "../middleware/auth";

const usersRoute = new Hono<Env>();

usersRoute.use("/*", authMiddleware);

// List users (paginated, filterable by role)
usersRoute.get("/", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const url = new URL(c.req.url);
  const { page, limit } = getPaginationParams(url);
  const offset = getOffset({ page, limit });
  const role = url.searchParams.get("role");

  const conditions = [isNull(users.deletedAt)];
  if (role) {
    conditions.push(eq(users.role, role as "admin" | "cashier" | "customer"));
  }

  const where = and(...conditions);

  const [data, [{ total }]] = await Promise.all([
    db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      phoneNumber: users.phoneNumber,
      role: users.role,
      dateOfBirth: users.dateOfBirth,
      currentPoints: users.currentPoints,
      totalPoints: users.totalPoints,
      createdAt: users.createdAt,
    }).from(users).where(where).limit(limit).offset(offset).orderBy(users.createdAt),
    db.select({ total: count() }).from(users).where(where),
  ]);

  return c.json({ users: data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Search users by phone or name (for customer search component)
usersRoute.get("/search", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const q = c.req.query("q") || "";

  if (q.length < 2) {
    return c.json({ data: [] });
  }

  const data = await db
    .select({
      id: users.id,
      name: users.name,
      phoneNumber: users.phoneNumber,
      currentPoints: users.currentPoints,
      totalPoints: users.totalPoints,
    })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        eq(users.role, "customer"),
        or(like(users.phoneNumber, `%${q}%`), like(users.name, `%${q}%`))
      )
    )
    .limit(10);

  return c.json({ data });
});

// Create user
usersRoute.post("/", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json<{
    username?: string;
    name: string;
    phoneNumber: string;
    password?: string;
    dateOfBirth?: string;
    role: "admin" | "cashier" | "customer";
  }>();
  const currentUser = c.get("user");

  // Only admins can create staff
  if ((body.role === "admin" || body.role === "cashier") && currentUser.role !== "admin") {
    return c.json({ error: "Only admins can create staff users" }, 403);
  }

  // Validate required fields
  if (!body.name || !body.phoneNumber || !body.role) {
    return c.json({ error: "Name, phone number, and role are required" }, 400);
  }

  // Staff must have username and password
  if ((body.role === "admin" || body.role === "cashier") && (!body.username || !body.password)) {
    return c.json({ error: "Staff users require username and password" }, 400);
  }

  // Check for duplicate phone number
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneNumber, body.phoneNumber))
    .limit(1);

  if (existing) {
    return c.json({ error: "Phone number already registered" }, 409);
  }

  // Check for duplicate username
  if (body.username) {
    const [existingUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (existingUsername) {
      return c.json({ error: "Username already taken" }, 409);
    }
  }

  const id = generateId();
  const hashedPassword = body.password ? await hashPassword(body.password) : null;

  await db.insert(users).values({
    id,
    username: body.username || null,
    name: body.name,
    phoneNumber: body.phoneNumber,
    password: hashedPassword,
    dateOfBirth: body.dateOfBirth || null,
    role: body.role,
    createdAt: Date.now(),
  });

  await logAudit(db, {
    action: "user_created",
    details: { userId: id, role: body.role, name: body.name },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ id }, 201);
});

// Update user
usersRoute.patch("/:id", requireRole("admin", "cashier"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    phoneNumber?: string;
    password?: string;
    dateOfBirth?: string;
    username?: string;
  }>();
  const currentUser = c.get("user");

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Cashiers can only edit customers
  if (currentUser.role === "cashier" && user.role !== "customer") {
    return c.json({ error: "Cashiers can only edit customer accounts" }, 403);
  }

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.phoneNumber) updates.phoneNumber = body.phoneNumber;
  if (body.dateOfBirth) updates.dateOfBirth = body.dateOfBirth;
  if (body.username) updates.username = body.username;
  if (body.password) updates.password = await hashPassword(body.password);

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  await db.update(users).set(updates).where(eq(users.id, id));

  await logAudit(db, {
    action: "user_updated",
    details: { userId: id, fields: Object.keys(updates) },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true });
});

// Soft delete user
usersRoute.delete("/:id", requireRole("admin"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const currentUser = c.get("user");

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  if (user.id === currentUser.id) {
    return c.json({ error: "Cannot delete your own account" }, 400);
  }

  await db.update(users).set({ deletedAt: Date.now() }).where(eq(users.id, id));

  await logAudit(db, {
    action: "user_deleted",
    details: { userId: id, name: user.name, role: user.role },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true });
});

export default usersRoute;
