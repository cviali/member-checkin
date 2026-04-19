import { Hono } from "hono";
import { eq, and, gte, count, sql, isNull } from "drizzle-orm";
import type { Env } from "../types";
import { getDb } from "../db";
import { users, checkIns, redemptions } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";

const statsRoute = new Hono<Env>();

statsRoute.use("/*", authMiddleware, requireRole("admin", "cashier"));

statsRoute.get("/", async (c) => {
  const db = getDb(c.env.DB);

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  // Start of this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthMs = startOfMonth.getTime();

  // 90 days ago
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  const [
    [{ totalMembers }],
    [{ pendingCheckIns }],
    [{ pendingRedemptions }],
    [{ pointsThisMonth }],
    [{ checkInsToday }],
  ] = await Promise.all([
    db
      .select({ totalMembers: count() })
      .from(users)
      .where(and(eq(users.role, "customer"), isNull(users.deletedAt))),
    db
      .select({ pendingCheckIns: count() })
      .from(checkIns)
      .where(and(eq(checkIns.status, "pending"), isNull(checkIns.deletedAt))),
    db
      .select({ pendingRedemptions: count() })
      .from(redemptions)
      .where(eq(redemptions.status, "pending")),
    db
      .select({
        pointsThisMonth: sql<number>`COALESCE(SUM(${checkIns.pointsEarned}), 0)`,
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.status, "approved"),
          gte(checkIns.processedAt, monthMs),
          isNull(checkIns.deletedAt)
        )
      ),
    db
      .select({ checkInsToday: count() })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.status, "approved"),
          gte(checkIns.processedAt, todayMs),
          isNull(checkIns.deletedAt)
        )
      ),
  ]);

  // Chart data: daily approved check-ins and completed redemptions over 90 days
  const checkInChart = await db
    .select({
      day: sql<string>`DATE(${checkIns.processedAt} / 1000, 'unixepoch')`.as("day"),
      checkInsCount: count(),
    })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.status, "approved"),
        gte(checkIns.processedAt, ninetyDaysAgo),
        isNull(checkIns.deletedAt)
      )
    )
    .groupBy(sql`DATE(${checkIns.processedAt} / 1000, 'unixepoch')`);

  const redemptionChart = await db
    .select({
      day: sql<string>`DATE(${redemptions.processedAt} / 1000, 'unixepoch')`.as("day"),
      redemptionsCount: count(),
    })
    .from(redemptions)
    .where(
      and(
        eq(redemptions.status, "approved"),
        gte(redemptions.processedAt, ninetyDaysAgo)
      )
    )
    .groupBy(sql`DATE(${redemptions.processedAt} / 1000, 'unixepoch')`);

  // Merge chart data
  const chartMap: Record<string, { checkIns: number; redemptions: number }> = {};
  for (const row of checkInChart) {
    chartMap[row.day] = { checkIns: row.checkInsCount, redemptions: 0 };
  }
  for (const row of redemptionChart) {
    if (chartMap[row.day]) {
      chartMap[row.day].redemptions = row.redemptionsCount;
    } else {
      chartMap[row.day] = { checkIns: 0, redemptions: row.redemptionsCount };
    }
  }

  const chartData = Object.entries(chartMap)
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return c.json({
    totalMembers,
    checkInsToday,
    pendingCheckIns,
    pendingRedemptions,
    pointsThisMonth,
    chartData,
  });
});

export default statsRoute;
