import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  console.log("[auth/callback] full URL:", request.url);
  console.log("[auth/callback] searchParams:", Object.fromEntries(searchParams));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Flow 1: PKCE code exchange
  const code = searchParams.get("code");
  if (code) {
    console.log("[auth/callback] handling code flow");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] exchangeCode result:", { error: error?.message, email: data?.user?.email });

    if (!error && data.user?.email) {
      await syncUser(origin, data.user.email);
      return NextResponse.redirect(`${origin}/events`);
    }
    console.error("[auth/callback] code exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/auth/login?error=code_failed`);
  }

  // Flow 2: token_hash (magic link / email OTP)
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "magiclink" | null;
  if (token_hash && type) {
    console.log("[auth/callback] handling token_hash flow, type:", type);
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    console.log("[auth/callback] verifyOtp result:", { error: error?.message, email: data?.user?.email });

    if (!error && data.user?.email) {
      await syncUser(origin, data.user.email);
      return NextResponse.redirect(`${origin}/events`);
    }
    console.error("[auth/callback] token_hash verification failed:", error?.message);
    return NextResponse.redirect(`${origin}/auth/login?error=token_failed`);
  }

  console.error("[auth/callback] no code or token_hash found in URL");
  return NextResponse.redirect(`${origin}/auth/login?error=no_params`);
}

async function syncUser(origin: string, email: string) {
  try {
    await fetch(`${origin}/api/auth/sync-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, accountType: "regular" }),
    });
  } catch (e) {
    console.error("[auth/callback] syncUser failed:", e);
  }
}
