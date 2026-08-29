import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { apiError, GENERIC_ERROR } from "@/lib/http";

// Remove o áudio de voz do anúncio.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("id, profile_id, audio_path").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const p = ad.audio_path as string | null;
  const { error } = await admin.from("ads").update({ audio_path: null }).eq("id", adId);
  if (error) return apiError(GENERIC_ERROR, 500, error);
  if (p && p.startsWith(`${user.id}/${adId}/`)) await admin.storage.from("ad-media").remove([p]);
  return NextResponse.json({ ok: true });
}
