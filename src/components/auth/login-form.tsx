"use client";

import { useActionState } from "react";
import { sendLoginLink, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(sendLoginLink, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg border p-6 text-center space-y-2">
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a login link to <span className="font-medium text-foreground">{state.email}</span>.
          Click it to sign in.
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          Didn&apos;t get it? Check spam or{" "}
          <button
            onClick={() => window.location.reload()}
            className="underline underline-offset-4"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Account type</Label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input type="radio" name="accountType" value="regular" defaultChecked className="sr-only" />
            <div>
              <p className="text-sm font-medium">Regular</p>
              <p className="text-xs text-muted-foreground">Persistent account</p>
            </div>
          </label>
          <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input type="radio" name="accountType" value="guest" className="sr-only" />
            <div>
              <p className="text-sm font-medium">Guest</p>
              <p className="text-xs text-muted-foreground">Temporary access</p>
            </div>
          </label>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send login link"}
      </Button>
    </form>
  );
}
