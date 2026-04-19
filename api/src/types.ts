import type { Context } from "hono";

export interface Env {
  Bindings: {
    DB: D1Database;
    BUCKET: R2Bucket;
    JWT_SECRET: string;
  };
  Variables: {
    user: JWTPayload;
  };
}

export interface JWTPayload {
  id: string;
  username: string | null;
  role: "admin" | "cashier" | "customer";
  name: string;
  phoneNumber: string;
}

export type AppContext = Context<Env>;

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
