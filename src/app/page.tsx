import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">CourtSync</h1>
        <p className="text-muted-foreground text-lg">
          Organize badminton games. Track payments. Manage waiting lists.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Button size="lg" className="w-full">
            Create Event
          </Button>
          <Button size="lg" variant="outline" className="w-full">
            Join Event
          </Button>
        </div>
      </div>
    </main>
  );
}
