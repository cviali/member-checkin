import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Users ─────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").unique().notNull(),
  password: text("password"),
  dateOfBirth: text("date_of_birth"),
  role: text("role", { enum: ["admin", "cashier", "customer"] }).notNull(),
  currentPoints: integer("current_points").default(0).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
});

// ─── Courts ────────────────────────────────────────────────────
export const courts = sqliteTable("courts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sportType: text("sport_type", { enum: ["padel", "tennis", "badminton"] }).notNull(),
  variant: text("variant"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: integer("created_at").notNull(),
});

// ─── Check-ins ─────────────────────────────────────────────────
export const checkIns = sqliteTable("check_ins", {
  id: text("id").primaryKey(),
  customerPhoneNumber: text("customer_phone_number").notNull(),
  sportType: text("sport_type").notNull(),
  courtsBooked: text("courts_booked").notNull(), // JSON: [{courtId, courtName, hours}]
  pointsEarned: integer("points_earned").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  processedBy: text("processed_by"),
  processedAt: integer("processed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at"),
});

// ─── Rewards ───────────────────────────────────────────────────
export const rewards = sqliteTable("rewards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  pointsRequired: integer("points_required").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at"),
});

// ─── Redemptions ───────────────────────────────────────────────
export const redemptions = sqliteTable("redemptions", {
  id: text("id").primaryKey(),
  rewardId: text("reward_id").notNull(),
  customerPhoneNumber: text("customer_phone_number").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  requestedAt: integer("requested_at").notNull(),
  processedAt: integer("processed_at"),
  processedBy: text("processed_by"),
  notes: text("notes"),
});

// ─── Audit Logs ────────────────────────────────────────────────
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  details: text("details"),
  userId: text("user_id"),
  username: text("username"),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at").notNull(),
});
