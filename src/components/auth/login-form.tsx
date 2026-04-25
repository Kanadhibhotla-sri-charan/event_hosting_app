"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"regular" | "guest">("regular");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { accountType },
      },
    });

    setPending(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border p-6 text-center space-y-2">
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a login link to{" "}
          <span className="font-medium text-foreground">{email}</span>.
          Click it to sign in.
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          Didn&apos;t get it? Check spam or{" "}
          <button
            onClick={() => setSent(false)}
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
    <form onSubmit={handleSend} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Account type</Label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="accountType"
              value="regular"
              checked={accountType === "regular"}
              onChange={() => setAccountType("regular")}
              className="sr-only"
            />
            <div>
              <p className="text-sm font-medium">Regular</p>
              <p className="text-xs text-muted-foreground">Persistent account</p>
            </div>
          </label>
          <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="accountType"
              value="guest"
              checked={accountType === "guest"}
              onChange={() => setAccountType("guest")}
              className="sr-only"
            />
            <div>
              <p className="text-sm font-medium">Guest</p>
              <p className="text-xs text-muted-foreground">Temporary access</p>
            </div>
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send login link"}
      </Button>
    </form>
  );
}
