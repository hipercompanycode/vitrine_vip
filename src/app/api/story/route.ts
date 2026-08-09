import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

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
  const { data: ad } = await admin.from("ads").select("id, profile_id").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  // plano permite story?
  const { data: sub } = await admin
    .from("subscriptions").select("plans ( allows_story )")
    .eq("profile_id", user.id).eq("status", "active").gt("current_period_end", new Date().toISOString()).maybeSingle();
  const allowsStory = (sub?.plans as unknown as { allows_story: boolean } | null)?.allows_story ?? false;
  if (!allowsStory) return NextResponse.json({ error: "seu plano não inclui story" }, { status: 403 });

  // substitui o anterior (remove objetos + linhas)
  const { data: olds } = await admin.from("stories").select("id, storage_path").eq("ad_id", adId);
  for (const o of olds ?? []) {
    await admin.storage.from("ad-media").remove([o.storage_path as string]);
  }
  if ((olds ?? []).length) await admin.from("stories").delete().eq("ad_id", adId);

  const { data: inserted, error } = await admin
    .from("stories").insert({ ad_id: adId, storage_path: storagePath }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: inserted.id });
}
