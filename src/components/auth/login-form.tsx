"use client";

import { useActionState, useState } from "react";
import { sendOtp, verifyOtp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthState = {};

export function LoginForm() {
  const [otpSent, setOtpSent] = useState(false);
  const [emailData, setEmailData] = useState<{ email: string; accountType: "regular" | "guest" }>({ email: "", accountType: "regular" });

  const [sendState, sendAction, sendPending] = useActionState(
    async (prev: AuthState, formData: FormData) => {
      const result = await sendOtp(prev, formData);
      if (result.success && result.email) {
        setEmailData({
          email: result.email,
          accountType: (result.accountType ?? "regular"),
        });
        setOtpSent(true);
      }
      return result;
    },
    initialState
  );

  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyOtp,
    initialState
  );

  if (otpSent) {
    return (
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="email" value={emailData.email} />
        <input type="hidden" name="accountType" value={emailData.accountType} />

        <div className="space-y-2">
          <Label htmlFor="token">Enter the 6-digit OTP sent to {emailData.email}</Label>
          <Input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="text-center text-lg tracking-widest"
            autoFocus
            required
          />
        </div>

        {verifyState.error && (
          <p className="text-sm text-destructive">{verifyState.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={verifyPending}>
          {verifyPending ? "Verifying…" : "Verify OTP"}
        </Button>

        <button
          type="button"
          onClick={() => setOtpSent(false)}
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={sendAction} className="space-y-4">
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

      {sendState.error && (
        <p className="text-sm text-destructive">{sendState.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={sendPending}>
        {sendPending ? "Sending OTP…" : "Send OTP"}
      </Button>
    </form>
  );
}
