"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, and, count, asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { events, participants, paymentScreenshots, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";
import { createClient } from "@/lib/supabase/server";

// ─── Create Event ─────────────────────────────────────────────────────────────

const createEventSchema = z.object({
  name: z.string().min(2, "Event name is required"),
  venue: z.string().min(2, "Venue is required"),
  eventDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  deadline: z.string().min(1, "Deadline is required"),
  maxMainList: z.coerce.number().min(20).max(36),
  maxWaitingList: z.coerce.number().min(1).max(50),
  paymentAmount: z.coerce.number().min(1, "Payment amount is required"),
  upiId: z.string().min(3, "UPI ID is required"),
});

export type CreateEventState = { error?: string };

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = createEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;

  // Combine date + time into full timestamps
  const startTime = new Date(`${d.eventDate}T${d.startTime}`);
  const endTime = new Date(`${d.eventDate}T${d.endTime}`);
  const deadline = new Date(`${d.eventDate}T${d.deadline}`);
  // Auto-close 15 min after end time (BR-14, BR-21)
  const autoCloseAt = new Date(endTime.getTime() + 15 * 60 * 1000);

  if (deadline >= startTime) return { error: "Deadline must be before start time" };
  if (startTime >= endTime) return { error: "Start time must be before end time" };

  const [event] = await db
    .insert(events)
    .values({
      hostId: user.id,
      name: d.name,
      venue: d.venue,
      eventDate: startTime,
      startTime,
      endTime,
      autoCloseAt,
      deadline,
      maxMainList: d.maxMainList,
      maxWaitingList: d.maxWaitingList,
      paymentAmount: String(d.paymentAmount),
      upiId: d.upiId,
      status: "open",
    })
    .returning({ id: events.id });

  redirect(`/events/${event.id}`);
}

// ─── Reserve Slot (10 min window, start of join flow) ─────────────────────────

export async function reserveSlot(eventId: string): Promise<{ error?: string; participantId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return { error: "Event not found" };
  if (event.status !== "open") return { error: "Event is not open for joining" };
  if (new Date() > event.deadline) return { error: "Deadline has passed" };

  // Check already joined
  const [existing] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.userId, user.id)))
    .limit(1);
  if (existing) return { error: "You have already joined this event" };

  // Count confirmed main list spots
  const [{ value: confirmedCount }] = await db
    .select({ value: count() })
    .from(participants)
    .where(
      and(
        eq(participants.eventId, eventId),
        eq(participants.status, "main_list_confirmed")
      )
    );

  // Count active reservations (within 10-min window)
  const [{ value: reservedCount }] = await db
    .select({ value: count() })
    .from(participants)
    .where(
      and(
        eq(participants.eventId, eventId),
        eq(participants.status, "slot_reserved"),
        sql`${participants.reservationExpiresAt} > now()`
      )
    );

  const takenSlots = Number(confirmedCount) + Number(reservedCount);

  if (takenSlots >= event.maxMainList) {
    return { error: "MAIN_LIST_FULL" };
  }

  const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const [participant] = await db
    .insert(participants)
    .values({
      eventId,
      userId: user.id,
      status: "slot_reserved",
      paymentStatus: "awaiting_upload",
      reservationExpiresAt,
    })
    .returning({ id: participants.id });

  return { participantId: participant.id };
}

// ─── Join Waiting List ────────────────────────────────────────────────────────

export async function joinWaitingList(eventId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return { error: "Event not found" };
  if (event.status !== "open") return { error: "Event is not accepting registrations" };
  if (new Date() > event.deadline) return { error: "Deadline has passed" };

  const [existing] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.userId, user.id)))
    .limit(1);
  if (existing) return { error: "You have already registered for this event" };

  const [{ value: wlCount }] = await db
    .select({ value: count() })
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.status, "waiting_list")));

  if (Number(wlCount) >= event.maxWaitingList) {
    return { error: "Waiting list is full" };
  }

  const position = Number(wlCount) + 1;

  await db.insert(participants).values({
    eventId,
    userId: user.id,
    status: "waiting_list",
    paymentStatus: "not_required",
    waitingListPosition: position,
    interestRegisteredAt: new Date(),
  });

  return {};
}

// ─── Confirm Slot via Screenshot Upload ───────────────────────────────────────

export async function confirmSlotWithScreenshot(
  participantId: string,
  storagePath: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.userId, user.id)))
    .limit(1);

  if (!participant) return { error: "Participant record not found" };

  if (
    participant.status !== "slot_reserved" &&
    participant.status !== "promotion_pending"
  ) {
    return { error: "No active slot reservation found" };
  }

  // Check reservation hasn't expired
  if (
    participant.status === "slot_reserved" &&
    participant.reservationExpiresAt &&
    new Date() > participant.reservationExpiresAt
  ) {
    await db
      .update(participants)
      .set({ status: "reservation_expired", paymentStatus: "forfeited", updatedAt: new Date() })
      .where(eq(participants.id, participantId));
    return { error: "Your slot reservation expired. Please try joining again." };
  }

  // Count confirmed to get main list position
  const [{ value: confirmedCount }] = await db
    .select({ value: count() })
    .from(participants)
    .where(
      and(
        eq(participants.eventId, participant.eventId),
        eq(participants.status, "main_list_confirmed")
      )
    );

  const uploadedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(participants)
      .set({
        status: "main_list_confirmed",
        paymentStatus: "confirmed",
        mainListPosition: Number(confirmedCount) + 1,
        screenshotUploadedAt: uploadedAt,
        updatedAt: uploadedAt,
      })
      .where(eq(participants.id, participantId));

    await tx.insert(paymentScreenshots).values({
      participantId,
      eventId: participant.eventId,
      userId: user.id,
      storagePath,
      uploadedAt,
    });
  });

  return {};
}

// ─── Leave Waiting List ───────────────────────────────────────────────────────

export async function leaveWaitingList(eventId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .update(participants)
    .set({ status: "removed", updatedAt: new Date() })
    .where(
      and(
        eq(participants.eventId, eventId),
        eq(participants.userId, user.id),
        eq(participants.status, "waiting_list")
      )
    );

  // Re-number waiting list positions
  const remaining = await db
    .select()
    .from(participants)
    .where(and(eq(participants.eventId, eventId), eq(participants.status, "waiting_list")))
    .orderBy(asc(participants.interestRegisteredAt));

  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(participants)
      .set({ waitingListPosition: i + 1 })
      .where(eq(participants.id, remaining[i].id));
  }

  return {};
}
