"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid phone number with country code (e.g. +91XXXXXXXXXX)"),
  accountType: z.enum(["regular", "guest"]).default("regular"),
});

const otpSchema = z.object({
  phone: z.string(),
  token: z.string().length(6, "OTP must be 6 digits"),
  accountType: z.enum(["regular", "guest"]).default("regular"),
});

export type AuthState = {
  error?: string;
  success?: boolean;
  phone?: string;
  accountType?: "regular" | "guest";
};

export async function sendOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = phoneSchema.safeParse({
    phone: formData.get("phone"),
    accountType: formData.get("accountType") ?? "regular",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { phone, accountType } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    return { error: error.message };
  }

  return { success: true, phone, accountType };
}

export async function verifyOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = otpSchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
    accountType: formData.get("accountType") ?? "regular",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { phone, token, accountType } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { error: error.message };
  }

  // Upsert user record in our DB (Supabase auth user ≠ our users table)
  // Done via API route to use service role key safely
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sync-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, accountType }),
  });

  redirect("/events");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
