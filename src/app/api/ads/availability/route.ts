import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { available } = await request.json().catch(() => ({ available: false }));
  const value = available === true;

  const admin = createAdminClient();
  const { error } = await admin
    .from("ads")
    .update({ is_available: value, available_since: value ? new Date().toISOString() : null })
    .eq("profile_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, is_available: value });
}
