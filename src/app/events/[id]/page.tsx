import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { events, participants, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JoinPanel } from "@/components/events/join-panel";
import { ParticipantList } from "@/components/events/participant-list";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) notFound();

  const currentUser = await getCurrentUser();

  // Load main list with user names
  const mainList = await db
    .select({
      id: participants.id,
      name: users.name,
      email: users.email,
      position: participants.mainListPosition,
      status: participants.status,
      paymentStatus: participants.paymentStatus,
      uploadedAt: participants.screenshotUploadedAt,
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .where(and(eq(participants.eventId, id), eq(participants.status, "main_list_confirmed")))
    .orderBy(asc(participants.mainListPosition));

  const waitingList = await db
    .select({
      id: participants.id,
      name: users.name,
      email: users.email,
      position: participants.waitingListPosition,
      status: participants.status,
      registeredAt: participants.interestRegisteredAt,
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .where(and(eq(participants.eventId, id), eq(participants.status, "waiting_list")))
    .orderBy(asc(participants.waitingListPosition));

  // Current user's participant record for this event
  const [myParticipant] = currentUser
    ? await db
        .select()
        .from(participants)
        .where(and(eq(participants.eventId, id), eq(participants.userId, currentUser.id)))
        .limit(1)
    : [undefined];

  const isHost =
    currentUser?.id === event.hostId ||
    false;

  const isDeadlinePassed = new Date() > event.deadline;
  const slotsLeft = event.maxMainList - mainList.length;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full gap-6">
      {/* Header */}
      <div>
        <Link href="/events" className="text-xs text-muted-foreground hover:underline mb-2 block">
          ← All events
        </Link>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{event.name}</h1>
          <Badge variant={event.status === "open" ? "default" : "secondary"}>
            {event.status}
          </Badge>
        </div>
      </div>

      {/* Event Info */}
      <div className="text-sm space-y-1 text-muted-foreground">
        <p className="font-medium text-foreground">{event.venue}</p>
        <p>
          {new Date(event.startTime).toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
        <p>
          {new Date(event.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {new Date(event.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p>Deadline: {new Date(event.deadline).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>

      {/* Payment Info */}
      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-sm font-medium">Payment details</p>
        <p className="text-2xl font-bold">₹{event.paymentAmount}</p>
        <p className="text-sm text-muted-foreground">UPI: <span className="font-mono text-foreground">{event.upiId}</span></p>
        <p className="text-xs text-muted-foreground">Pay via any UPI app, then upload screenshot below</p>
      </div>

      {/* Slot counts */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border p-3">
          <p className="text-2xl font-bold">{mainList.length}<span className="text-muted-foreground text-base font-normal">/{event.maxMainList}</span></p>
          <p className="text-xs text-muted-foreground mt-1">Main list</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-2xl font-bold">{waitingList.length}<span className="text-muted-foreground text-base font-normal">/{event.maxWaitingList}</span></p>
          <p className="text-xs text-muted-foreground mt-1">Waiting list</p>
        </div>
      </div>

      {/* Join panel — only shown if not host and deadline not passed */}
      {!isHost && !isDeadlinePassed && (
        <JoinPanel
          eventId={event.id}
          slotsLeft={slotsLeft}
          maxWaitingList={event.maxWaitingList}
          waitingListCount={waitingList.length}
          myParticipant={myParticipant ?? null}
        />
      )}

      {isDeadlinePassed && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Registration deadline has passed.
        </p>
      )}

      <Separator />

      {/* Participant Lists */}
      <ParticipantList
        title={`Main list (${mainList.length}/${event.maxMainList})`}
        entries={mainList.map((p) => ({
          id: p.id,
          display: p.name ?? p.email,
          position: p.position ?? undefined,
          badge: p.status,
        }))}
        emptyText="No confirmed players yet"
      />

      <ParticipantList
        title={`Waiting list (${waitingList.length}/${event.maxWaitingList})`}
        entries={waitingList.map((p) => ({
          id: p.id,
          display: p.name ?? p.email,
          position: p.position ?? undefined,
          badge: "waiting",
        }))}
        emptyText="Waiting list is empty"
      />
    </main>
  );
}
