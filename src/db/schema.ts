import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const accountTypeEnum = pgEnum("account_type", ["regular", "guest"]);

export const eventStatusEnum = pgEnum("event_status", [
  "created",
  "open",
  "deadline_passed",
  "in_progress",
  "closed",
  "archived",
  "cancelled",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "slot_reserved",        // 10-min window to upload screenshot
  "main_list_confirmed",  // screenshot uploaded, on main list
  "waiting_list",         // expressed interest, on waiting list
  "promotion_pending",    // promoted from WL, window to upload payment screenshot
  "promotion_expired",    // did not upload in time, back out
  "reservation_expired",  // did not upload in 10-min window
  "dropped_refund_pending", // withdrew pre-deadline
  "dropped_no_refund",    // withdrew post-deadline
  "removed",              // host flagged as fraudulent
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "not_required",     // waiting list — no payment yet
  "awaiting_upload",  // reserved or promoted — screenshot expected
  "confirmed",        // screenshot uploaded, slot confirmed
  "refund_pending",   // dropped pre-deadline or event cancelled
  "refunded",         // refund processed
  "forfeited",        // dropped post-deadline
  "flagged",          // host flagged as fraudulent
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  accountType: accountTypeEnum("account_type").notNull().default("regular"),
  // For guest accounts: auto-delete 15 min after last linked event's close time
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Event Templates ──────────────────────────────────────────────────────────

export const eventTemplates = pgTable("event_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  venue: text("venue"),
  maxMainList: integer("max_main_list").notNull(),
  maxWaitingList: integer("max_waiting_list").notNull(),
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }).notNull(),
  upiId: text("upi_id").notNull(),
  // How many hours before event start to set deadline (e.g. 2 = 2hrs before)
  deadlineOffsetHours: integer("deadline_offset_hours").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Events ───────────────────────────────────────────────────────────────────

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => users.id),
  templateId: uuid("template_id").references(() => eventTemplates.id),
  name: text("name").notNull(),
  venue: text("venue").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  // 15 min after endTime the event archives and guest accounts are deleted
  autoCloseAt: timestamp("auto_close_at", { withTimezone: true }).notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  maxMainList: integer("max_main_list").notNull(),
  maxWaitingList: integer("max_waiting_list").notNull(),
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }).notNull(),
  upiId: text("upi_id").notNull(),
  status: eventStatusEnum("status").notNull().default("created"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Co-hosts ─────────────────────────────────────────────────────────────────

export const coHosts = pgTable("co_hosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Participants ─────────────────────────────────────────────────────────────

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: participantStatusEnum("status").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull(),
  // Position on main list or waiting list (1-indexed, set at confirmation time)
  mainListPosition: integer("main_list_position"),
  waitingListPosition: integer("waiting_list_position"),
  // Server-side timestamps that determine ordering (never client-provided)
  screenshotUploadedAt: timestamp("screenshot_uploaded_at", { withTimezone: true }),
  interestRegisteredAt: timestamp("interest_registered_at", { withTimezone: true }),
  // Slot reservation expiry (10-min window)
  reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }),
  // Promotion window expiry (dynamic: 15min–2hrs)
  promotionExpiresAt: timestamp("promotion_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Payment Screenshots ───────────────────────────────────────────────────────

export const paymentScreenshots = pgTable("payment_screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  // Supabase Storage path
  storagePath: text("storage_path").notNull(),
  // OCR-extracted fields (populated asynchronously, nullable)
  extractedUtr: text("extracted_utr"),
  extractedAmount: numeric("extracted_amount", { precision: 10, scale: 2 }),
  extractedRecipientUpi: text("extracted_recipient_upi"),
  extractedTransactionAt: timestamp("extracted_transaction_at", { withTimezone: true }),
  extractedSenderName: text("extracted_sender_name"),
  // Consistency check results (null = not yet checked)
  amountMatch: boolean("amount_match"),
  recipientUpiMatch: boolean("recipient_upi_match"),
  timestampValid: boolean("timestamp_valid"),
  utrDuplicate: boolean("utr_duplicate"),
  // Host flagged as fraudulent
  flagged: boolean("flagged").notNull().default(false),
  flaggedReason: text("flagged_reason"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Refund Records ───────────────────────────────────────────────────────────

export const refundRecords = pgTable("refund_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(), // 'pre_deadline_drop' | 'event_cancelled'
  status: text("status").notNull().default("pending"), // 'pending' | 'processed'
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  hostedEvents: many(events),
  participants: many(participants),
  coHosts: many(coHosts),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(users, { fields: [events.hostId], references: [users.id] }),
  template: one(eventTemplates, { fields: [events.templateId], references: [eventTemplates.id] }),
  coHosts: many(coHosts),
  participants: many(participants),
  refunds: many(refundRecords),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  event: one(events, { fields: [participants.eventId], references: [events.id] }),
  user: one(users, { fields: [participants.userId], references: [users.id] }),
  screenshots: many(paymentScreenshots),
  refunds: many(refundRecords),
}));

export const paymentScreenshotsRelations = relations(paymentScreenshots, ({ one }) => ({
  participant: one(participants, { fields: [paymentScreenshots.participantId], references: [participants.id] }),
  event: one(events, { fields: [paymentScreenshots.eventId], references: [events.id] }),
  user: one(users, { fields: [paymentScreenshots.userId], references: [users.id] }),
}));

export const refundRecordsRelations = relations(refundRecords, ({ one }) => ({
  participant: one(participants, { fields: [refundRecords.participantId], references: [participants.id] }),
  event: one(events, { fields: [refundRecords.eventId], references: [events.id] }),
  user: one(users, { fields: [refundRecords.userId], references: [users.id] }),
}));
