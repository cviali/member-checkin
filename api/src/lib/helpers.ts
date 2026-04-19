import type { PaginationParams } from "../types";

export function getPaginationParams(url: URL): PaginationParams {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  return { page, limit };
}

export function getOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
}
