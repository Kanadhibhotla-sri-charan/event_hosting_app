import { createClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.phone) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, authUser.phone))
    .limit(1);

  return user ?? null;
}
