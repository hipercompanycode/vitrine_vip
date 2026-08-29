import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { apiError, GENERIC_ERROR } from "@/lib/http";

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
  const { data: ad } = await admin.from("ads").select("id, profile_id, story_last_at").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  // cooldown: só pode gravar um novo story 24h depois da última gravação (mesmo se removeu)
  const last = ad.story_last_at ? new Date(ad.story_last_at as string).getTime() : 0;
  const readyAt = last + 24 * 60 * 60 * 1000;
  if (Date.now() < readyAt) {
    const hoursLeft = Math.ceil((readyAt - Date.now()) / 3_600_000);
    return NextResponse.json({ error: `Você só pode gravar um novo story em ~${hoursLeft}h (1 por dia).` }, { status: 429 });
  }

  // plano permite story?
  const { data: sub } = await admin
    .from("subscriptions").select("plans ( allows_story )")
    .eq("profile_id", user.id).eq("status", "active").gt("current_period_end", new Date().toISOString()).maybeSingle();
  const allowsStory = (sub?.plans as unknown as { allows_story: boolean } | null)?.allows_story ?? false;
  if (!allowsStory) return NextResponse.json({ error: "seu plano não inclui story" }, { status: 403 });

  // pega anteriores ANTES de inserir (não perde o atual se a inserção falhar)
  const { data: olds } = await admin.from("stories").select("id, storage_path").eq("ad_id", adId);

  const { data: inserted, error } = await admin
    .from("stories").insert({ ad_id: adId, storage_path: storagePath }).select("id").single();
  if (error) return apiError(GENERIC_ERROR, 500, error);

  // marca a última gravação (base do cooldown de 24h) — sobrevive à remoção do story
  await admin.from("ads").update({ story_last_at: new Date().toISOString() }).eq("id", adId);

  for (const o of olds ?? []) {
    const p = o.storage_path as string;
    if (p.startsWith(`${user.id}/${adId}/`)) await admin.storage.from("ad-media").remove([p]);
    await admin.from("stories").delete().eq("id", o.id as string);
  }
  return NextResponse.json({ id: inserted.id });
}
