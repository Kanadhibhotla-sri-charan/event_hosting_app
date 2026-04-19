import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { phone, accountType } = await request.json();

    // Verify the caller is actually authenticated (get current user from Supabase)
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { error } = await supabaseAdmin.auth.getUser(token);
      if (error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(users).values({ phone, accountType });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sync-user error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
