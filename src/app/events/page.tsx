import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Events</h1>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">Sign out</Button>
        </form>
      </div>

      <p className="text-sm text-muted-foreground">
        Signed in as {user?.phone}
      </p>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-muted-foreground text-sm">No events yet.</p>
        <Button>Create Event</Button>
      </div>
    </main>
  );
}
