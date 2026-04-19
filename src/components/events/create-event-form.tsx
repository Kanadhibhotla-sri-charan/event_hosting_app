"use client";

import { useActionState } from "react";
import { createEvent, type CreateEventState } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: CreateEventState = {};

export function CreateEventForm() {
  const [state, action, pending] = useActionState(createEvent, initial);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Event name</Label>
        <Input id="name" name="name" placeholder="Saturday Badminton" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue">Venue</Label>
        <Input id="venue" name="venue" placeholder="Sports Arena, Block B" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDate">Date</Label>
        <Input id="eventDate" name="eventDate" type="date" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="time" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" name="endTime" type="time" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Registration deadline (time on event day)</Label>
        <Input id="deadline" name="deadline" type="time" required />
        <p className="text-xs text-muted-foreground">
          No drops or promotions after this time
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="maxMainList">Main list size</Label>
          <Input
            id="maxMainList"
            name="maxMainList"
            type="number"
            min={20}
            max={36}
            defaultValue={24}
            required
          />
          <p className="text-xs text-muted-foreground">20 – 36 players</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxWaitingList">Waiting list size</Label>
          <Input
            id="maxWaitingList"
            name="maxWaitingList"
            type="number"
            min={1}
            max={50}
            defaultValue={10}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentAmount">Payment per head (₹)</Label>
        <Input
          id="paymentAmount"
          name="paymentAmount"
          type="number"
          min={1}
          placeholder="300"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="upiId">Your UPI ID</Label>
        <Input id="upiId" name="upiId" placeholder="yourname@upi" required />
        <p className="text-xs text-muted-foreground">
          Participants will pay to this UPI ID
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
