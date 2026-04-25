import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusColor(status: string) {
  if (status === "open") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

export default async function EventsPage() {
  const user = await getCurrentUser();

  const allEvents = await db
    .select()
    .from(events)
    .orderBy(desc(events.startTime))
    .limit(50);

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">CourtSync</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/events/new">
            <Button size="sm">+ New event</Button>
          </Link>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">Sign out</Button>
          </form>
        </div>
      </div>

      {allEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-16">
          <p className="text-muted-foreground text-sm">No events yet.</p>
          <Link href="/events/new">
            <Button>Create your first event</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allEvents.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="hover:border-foreground/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{event.name}</CardTitle>
                    <Badge variant={statusColor(event.status)}>{event.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>{event.venue}</p>
                  <p>
                    {new Date(event.startTime).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    ·{" "}
                    {new Date(event.startTime).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(event.endTime).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p>₹{event.paymentAmount} · {event.maxMainList} players</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
