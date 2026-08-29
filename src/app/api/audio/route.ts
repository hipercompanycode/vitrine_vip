import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { apiError, GENERIC_ERROR } from "@/lib/http";

// Define o áudio de voz do anúncio. Livre pra qualquer anunciante dona do anúncio.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const storagePath = String(form.get("storage_path") ?? "");
  if (!adId || !storagePath) return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  if (!storagePath.startsWith(`${user.id}/${adId}/`)) {
    return NextResponse.json({ error: "caminho inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("id, profile_id, audio_path").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const { error } = await admin.from("ads").update({ audio_path: storagePath }).eq("id", adId);
  if (error) return apiError(GENERIC_ERROR, 500, error);

  // remove o áudio anterior (se havia e é do dono)
  const old = ad.audio_path as string | null;
  if (old && old !== storagePath && old.startsWith(`${user.id}/${adId}/`)) {
    await admin.storage.from("ad-media").remove([old]);
  }
  return NextResponse.json({ ok: true });
}
