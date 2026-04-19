"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reserveSlot, joinWaitingList, leaveWaitingList } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import type { participants } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Participant = InferSelectModel<typeof participants>;

export function JoinPanel({
  eventId,
  slotsLeft,
  maxWaitingList,
  waitingListCount,
  myParticipant,
}: {
  eventId: string;
  slotsLeft: number;
  maxWaitingList: number;
  waitingListCount: number;
  myParticipant: Participant | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Upload state
  const [reservedParticipantId, setReservedParticipantId] = useState<string | null>(
    myParticipant?.status === "slot_reserved" ? myParticipant.id : null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Already on main list
  if (myParticipant?.status === "main_list_confirmed") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 text-center">
        ✓ You are confirmed on the main list (#{myParticipant.mainListPosition})
      </div>
    );
  }

  // Already on waiting list
  if (myParticipant?.status === "waiting_list") {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm text-center">
          You are on the waiting list (#{myParticipant.waitingListPosition})
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await leaveWaitingList(eventId);
              if (res.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          Leave waiting list
        </Button>
        {error && <p className="text-xs text-destructive text-center">{error}</p>}
      </div>
    );
  }

  // Slot reserved — show upload form
  if (reservedParticipantId) {
    return (
      <UploadPanel
        participantId={reservedParticipantId}
        uploading={uploading}
        error={uploadError}
        onUpload={async (file) => {
          setUploading(true);
          setUploadError(null);
          const fd = new FormData();
          fd.append("file", file);
          fd.append("participantId", reservedParticipantId);
          const res = await fetch("/api/screenshots", { method: "POST", body: fd });
          const json = await res.json();
          setUploading(false);
          if (!res.ok) {
            setUploadError(json.error ?? "Upload failed");
          } else {
            router.refresh();
          }
        }}
      />
    );
  }

  const wlFull = waitingListCount >= maxWaitingList;

  return (
    <div className="space-y-3">
      {slotsLeft > 0 ? (
        <>
          <p className="text-sm text-center text-muted-foreground">
            {slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} available
          </p>
          <Button
            className="w-full"
            size="lg"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await reserveSlot(eventId);
                if (res.error === "MAIN_LIST_FULL") {
                  setError("Main list just filled up — you can join the waiting list instead.");
                } else if (res.error) {
                  setError(res.error);
                } else if (res.participantId) {
                  setReservedParticipantId(res.participantId);
                }
              })
            }
          >
            {isPending ? "Reserving slot…" : "Join — upload payment screenshot"}
          </Button>
        </>
      ) : (
        <p className="text-sm text-center text-muted-foreground">Main list is full</p>
      )}

      {slotsLeft === 0 && !wlFull && (
        <Button
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await joinWaitingList(eventId);
              if (res.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          {isPending ? "Joining…" : "Join waiting list"}
        </Button>
      )}

      {slotsLeft === 0 && wlFull && (
        <p className="text-xs text-center text-muted-foreground">Waiting list is also full.</p>
      )}

      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}

function UploadPanel({
  participantId,
  uploading,
  error,
  onUpload,
}: {
  participantId: string;
  uploading: boolean;
  error: string | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const [selected, setSelected] = useState<File | null>(null);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Upload payment screenshot</p>
        <p className="text-xs text-muted-foreground">
          Pay via UPI to the ID shown above, then upload your payment confirmation screenshot.
          Your slot is reserved for 10 minutes.
        </p>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/30 transition-colors">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setSelected(e.target.files?.[0] ?? null)}
        />
        {selected ? (
          <p className="text-sm text-center">{selected.name}</p>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Tap to choose screenshot<br />
            <span className="text-xs">JPG, PNG, WebP · max 5 MB</span>
          </p>
        )}
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full"
        disabled={!selected || uploading}
        onClick={() => selected && onUpload(selected)}
      >
        {uploading ? "Uploading…" : "Confirm payment & join"}
      </Button>
    </div>
  );
}
