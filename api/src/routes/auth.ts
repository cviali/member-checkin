import { Hono } from "hono";
import { SignJWT } from "jose";
import { eq, and, isNull } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { users } from "../db/schema";
import { verifyPassword } from "../lib/crypto";
import { authMiddleware } from "../middleware/auth";

const auth = new Hono<Env>();

// Staff login (username + password)
auth.post("/login", async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();

  if (!username || !password) {
    return c.json({ error: "Username and password are required" }, 400);
  }

  const db = getDb(c.env.DB);
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username), isNull(users.deletedAt)))
    .limit(1);

  if (!user || !user.password) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (user.role !== "admin" && user.role !== "cashier") {
    return c.json({ error: "Staff access only" }, 403);
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    phoneNumber: user.phoneNumber,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secret);

  return c.json({ token });
});

// Customer login (phoneNumber + dateOfBirth)
auth.post("/customer/login", async (c) => {
  const { phoneNumber, dateOfBirth } = await c.req.json<{
    phoneNumber: string;
    dateOfBirth: string;
  }>();

  if (!phoneNumber || !dateOfBirth) {
    return c.json({ error: "Phone number and date of birth are required" }, 400);
  }

  // Normalize phone: +62xxx → 0xxx, 8xx → 08xx
  let normalizedPhone = phoneNumber.replace(/\s+/g, "");
  if (normalizedPhone.startsWith("+62")) {
    normalizedPhone = "0" + normalizedPhone.slice(3);
  } else if (normalizedPhone.startsWith("62") && normalizedPhone.length > 10) {
    normalizedPhone = "0" + normalizedPhone.slice(2);
  } else if (/^[1-9]/.test(normalizedPhone)) {
    normalizedPhone = "0" + normalizedPhone;
  }

  const db = getDb(c.env.DB);
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.phoneNumber, normalizedPhone),
        eq(users.role, "customer"),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (user.dateOfBirth !== dateOfBirth) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    phoneNumber: user.phoneNumber,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secret);

  return c.json({ token });
});

// Get current user
auth.get("/me", authMiddleware, async (c) => {
  const payload = c.get("user");
  const db = getDb(c.env.DB);

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      phoneNumber: users.phoneNumber,
      role: users.role,
      dateOfBirth: users.dateOfBirth,
      currentPoints: users.currentPoints,
      totalPoints: users.totalPoints,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, payload.id), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

export default auth;
