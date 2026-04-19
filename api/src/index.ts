import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import courtsRoutes from "./routes/courts";
import checkInsRoutes from "./routes/checkins";
import rewardsRoutes from "./routes/rewards";
import redemptionsRoutes from "./routes/redemptions";
import statsRoutes from "./routes/stats";
import auditRoutes from "./routes/audit";

const app = new Hono<Env>();

// CORS
app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "https://checkin.vlocityarena.com"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// Error handler
app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.url}:`, err.message, err.stack);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "vlocity-arena-api" }));

// Mount routes
app.route("/auth", authRoutes);
app.route("/users", usersRoutes);
app.route("/courts", courtsRoutes);
app.route("/checkins", checkInsRoutes);
app.route("/rewards", rewardsRoutes);
app.route("/redemptions", redemptionsRoutes);
app.route("/stats", statsRoutes);
app.route("/audit-logs", auditRoutes);

export default app;
