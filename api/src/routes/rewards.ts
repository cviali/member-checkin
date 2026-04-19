import { Hono } from "hono";
import { eq, and, isNull, count, desc } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { rewards } from "../db/schema";
import { logAudit } from "../lib/audit";
import { getPaginationParams, getOffset, generateId, getClientIp } from "../lib/helpers";
import { authMiddleware, requireRole } from "../middleware/auth";

const rewardsRoute = new Hono<Env>();

// List active rewards (public for customer catalog)
rewardsRoute.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const url = new URL(c.req.url);
  const { page, limit } = getPaginationParams(url);
  const offset = getOffset({ page, limit });
  const search = url.searchParams.get("search");

  const conditions = [isNull(rewards.deletedAt), eq(rewards.isActive, 1)];

  const where = and(...conditions);

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(rewards)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(rewards.createdAt)),
    db.select({ total: count() }).from(rewards).where(where),
  ]);

  return c.json({ rewards: data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Serve reward image from R2
rewardsRoute.get("/image/:name", async (c) => {
  const name = c.req.param("name");
  const object = await c.env.BUCKET.get(`rewards/${name}`);

  if (!object) {
    return c.json({ error: "Image not found" }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, { headers });
});

// Upload reward image to R2 (admin only)
rewardsRoute.post("/upload", authMiddleware, requireRole("admin"), async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return c.json({ error: "No image file provided" }, 400);
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `reward-${Date.now()}.${ext}`;

  await c.env.BUCKET.put(`rewards/${filename}`, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ imageUrl: `/rewards/image/${filename}` });
});

// Create reward (admin only)
rewardsRoute.post("/", authMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DB);
  const currentUser = c.get("user");
  const body = await c.req.json<{
    name: string;
    description?: string;
    imageUrl?: string;
    pointsRequired: number;
  }>();

  if (!body.name || !body.pointsRequired || body.pointsRequired <= 0) {
    return c.json({ error: "Name and valid points required are needed" }, 400);
  }

  const id = generateId();
  await db.insert(rewards).values({
    id,
    name: body.name,
    description: body.description || null,
    imageUrl: body.imageUrl || null,
    pointsRequired: body.pointsRequired,
    createdAt: Date.now(),
  });

  await logAudit(db, {
    action: "reward_created",
    details: { rewardId: id, name: body.name, pointsRequired: body.pointsRequired },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ id }, 201);
});

// Update reward (admin only)
rewardsRoute.patch("/:id", authMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const currentUser = c.get("user");
  const body = await c.req.json<{
    name?: string;
    description?: string;
    imageUrl?: string;
    pointsRequired?: number;
    isActive?: number;
  }>();

  const [reward] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, id), isNull(rewards.deletedAt)))
    .limit(1);

  if (!reward) {
    return c.json({ error: "Reward not found" }, 404);
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
  if (body.pointsRequired !== undefined) updates.pointsRequired = body.pointsRequired;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  await db.update(rewards).set(updates).where(eq(rewards.id, id));

  await logAudit(db, {
    action: "reward_updated",
    details: { rewardId: id, fields: Object.keys(updates) },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true });
});

// Soft delete reward (admin only)
rewardsRoute.delete("/:id", authMiddleware, requireRole("admin"), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const currentUser = c.get("user");

  const [reward] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, id), isNull(rewards.deletedAt)))
    .limit(1);

  if (!reward) {
    return c.json({ error: "Reward not found" }, 404);
  }

  await db.update(rewards).set({ deletedAt: Date.now() }).where(eq(rewards.id, id));

  await logAudit(db, {
    action: "reward_deleted",
    details: { rewardId: id, name: reward.name },
    userId: currentUser.id,
    username: currentUser.username || currentUser.name,
    ipAddress: getClientIp(c.req.raw),
  });

  return c.json({ success: true });
});

export default rewardsRoute;
