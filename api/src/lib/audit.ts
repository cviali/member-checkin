import type { Database } from "../db";
import { auditLogs } from "../db/schema";

interface AuditEntry {
  action: string;
  details?: Record<string, unknown>;
  userId?: string;
  username?: string;
  ipAddress?: string;
}

export async function logAudit(db: Database, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    action: entry.action,
    details: entry.details ? JSON.stringify(entry.details) : null,
    userId: entry.userId ?? null,
    username: entry.username ?? null,
    ipAddress: entry.ipAddress ?? null,
    createdAt: Date.now(),
  });
}
