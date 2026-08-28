import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { apiError, GENERIC_ERROR } from "@/lib/http";
import { makeBlur, deleteBlur } from "@/lib/blur";

export const runtime = "nodejs";

// Alterna "ocultar para não logados" (nudez) de UMA foto do próprio anúncio.
//  - ligar : review = 'nudez'   + gera a cópia borrada (anônimo vê borrada)
//  - desligar: review = 'pendente' + remove a cópia borrada (volta pra aprovação)
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const mediaId = String(form.get("media_id") ?? "");
  if (!mediaId) return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });

  const admin = createAdminClient();
  const { data: m } = await admin
    .from("ad_media")
    .select("id, ad_id, type, storage_path, blur_path, review")
    .eq("id", mediaId)
    .maybeSingle();
  if (!m || m.type !== "photo") return NextResponse.json({ error: "foto não encontrada" }, { status: 404 });

  // dono do anúncio?
  const { data: ad } = await admin.from("ads").select("profile_id").eq("id", m.ad_id).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  if (m.review === "nudez") {
    // desligar: volta pra fila de aprovação, sem a versão borrada
    await deleteBlur(admin, m.blur_path as string | null);
    const { error } = await admin.from("ad_media").update({ review: "pendente", blur_path: null }).eq("id", mediaId);
    if (error) return apiError(GENERIC_ERROR, 500, error);
    return NextResponse.json({ review: "pendente" });
  }

  // ligar: gera (ou reaproveita) a cópia borrada e marca nudez
  const blurPath = (m.blur_path as string | null) ?? (await makeBlur(admin, m.storage_path as string));
  const { error } = await admin.from("ad_media").update({ review: "nudez", blur_path: blurPath }).eq("id", mediaId);
  if (error) return apiError(GENERIC_ERROR, 500, error);
  return NextResponse.json({ review: "nudez" });
}
