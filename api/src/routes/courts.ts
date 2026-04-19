import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { courts } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";

const courtsRoute = new Hono<Env>();

// List courts — returns all for staff, active-only for customers
courtsRoute.get("/", async (c) => {
  const db = getDb(c.env.DB);

  const data = await db
    .select()
    .from(courts)
    .orderBy(courts.sportType, courts.name);

  return c.json({ courts: data });
});

// Get single court
courtsRoute.get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");

  const [court] = await db
    .select()
    .from(courts)
    .where(eq(courts.id, id))
    .limit(1);

  if (!court) {
    return c.json({ error: "Court not found" }, 404);
  }

  return c.json(court);
});

// Toggle court active status (admin only)
courtsRoute.patch("/:id", authMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json<{ isActive?: boolean }>();

  const [court] = await db
    .select()
    .from(courts)
    .where(eq(courts.id, id))
    .limit(1);

  if (!court) {
    return c.json({ error: "Court not found" }, 404);
  }

  const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : court.isActive;

  await db
    .update(courts)
    .set({ isActive })
    .where(eq(courts.id, id));

  return c.json({ success: true });
});

export default courtsRoute;
