import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const mediaId = String(form.get("media_id") ?? "");
  if (!mediaId) return NextResponse.json({ error: "media_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data: media } = await admin
    .from("ad_media").select("id, ad_id, storage_path, is_cover, type, ads ( profile_id )").eq("id", mediaId).maybeSingle();
  const ownerId = (media?.ads as unknown as { profile_id: string } | null)?.profile_id;
  if (!media || ownerId !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  if ((media.storage_path as string).startsWith(`${user.id}/${media.ad_id}/`)) {
    const { error: rmErr } = await admin.storage.from("ad-media").remove([media.storage_path]);
    if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });
  }
  const { error: delErr } = await admin.from("ad_media").delete().eq("id", mediaId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (media.is_cover) {
    const { data: next } = await admin
      .from("ad_media").select("id").eq("ad_id", media.ad_id).eq("type", "photo")
      .order("position").limit(1).maybeSingle();
    if (next) await admin.from("ad_media").update({ is_cover: true }).eq("id", next.id);
  }
  return NextResponse.json({ ok: true });
}
