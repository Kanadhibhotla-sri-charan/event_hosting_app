import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { confirmSlotWithScreenshot } from "@/app/actions/events";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const participantId = formData.get("participantId") as string | null;

  if (!file || !participantId) {
    return NextResponse.json({ error: "Missing file or participantId" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  const supabase = await createClient();
  const ext = file.type.split("/")[1];
  const storagePath = `screenshots/${user.id}/${participantId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-screenshots")
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const result = await confirmSlotWithScreenshot(participantId, storagePath);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, storagePath });
}
