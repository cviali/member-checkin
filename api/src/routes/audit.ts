import { Hono } from "hono";
import { count, desc, like, and, gte, lte } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { auditLogs } from "../db/schema";
import { getPaginationParams, getOffset } from "../lib/helpers";
import { authMiddleware, requireRole } from "../middleware/auth";

const auditRoute = new Hono<Env>();

auditRoute.use("/*", authMiddleware, requireRole("admin"));

auditRoute.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const url = new URL(c.req.url);
  const { page, limit } = getPaginationParams(url);
  const offset = getOffset({ page, limit });
  const action = url.searchParams.get("action");
  const user = url.searchParams.get("user");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conditions: ReturnType<typeof like>[] = [];
  if (action) {
    conditions.push(like(auditLogs.action, `%${action}%`));
  }
  if (user) {
    conditions.push(like(auditLogs.username, `%${user}%`));
  }
  if (from) {
    conditions.push(gte(auditLogs.createdAt, parseInt(from, 10)));
  }
  if (to) {
    conditions.push(lte(auditLogs.createdAt, parseInt(to, 10)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(auditLogs.createdAt)),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  return c.json({ logs: data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

export default auditRoute;
