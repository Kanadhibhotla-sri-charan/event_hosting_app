import { CreateEventForm } from "@/components/events/create-event-form";

export default function NewEventPage() {
  return (
    <main className="flex-1 flex flex-col px-4 py-8 max-w-lg mx-auto w-full">
      <h1 className="text-xl font-bold mb-6">Create Event</h1>
      <CreateEventForm />
    </main>
  );
}
