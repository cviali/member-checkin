import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import type { Env, JWTPayload } from "../types";

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    c.set("user", {
      id: payload.id as string,
      username: (payload.username as string) || null,
      role: payload.role as JWTPayload["role"],
      name: payload.name as string,
      phoneNumber: payload.phoneNumber as string,
    });

    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

export function requireRole(...roles: JWTPayload["role"][]) {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  });
}
