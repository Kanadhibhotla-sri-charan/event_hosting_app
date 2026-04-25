"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  accountType: z.enum(["regular", "guest"]).default("regular"),
});

const otpSchema = z.object({
  email: z.string().email(),
  token: z.string().length(6, "OTP must be 6 digits"),
  accountType: z.enum(["regular", "guest"]).default("regular"),
});

export type AuthState = {
  error?: string;
  success?: boolean;
  email?: string;
  accountType?: "regular" | "guest";
};

export async function sendOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
    accountType: formData.get("accountType") ?? "regular",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, accountType } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, email, accountType };
}

export async function verifyOtp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = otpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    accountType: formData.get("accountType") ?? "regular",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, token, accountType } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sync-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, accountType }),
  });

  redirect("/events");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
