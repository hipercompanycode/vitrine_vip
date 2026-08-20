import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

// Pausar / reativar o anúncio. status 'paused' some das listagens (que filtram 'active').
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { status } = await request.json().catch(() => ({ status: "active" }));
  const next = status === "paused" ? "paused" : "active";

  const admin = createAdminClient();
  const { error } = await admin.from("ads").update({ status: next }).eq("profile_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: next });
}
