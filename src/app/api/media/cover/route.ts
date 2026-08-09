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
    .from("ad_media").select("id, ad_id, type, ads ( profile_id )").eq("id", mediaId).maybeSingle();
  const ownerId = (media?.ads as unknown as { profile_id: string } | null)?.profile_id;
  if (!media || ownerId !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  if (media.type !== "photo") return NextResponse.json({ error: "capa deve ser foto" }, { status: 400 });

  const { error: e1 } = await admin.from("ad_media").update({ is_cover: false }).eq("ad_id", media.ad_id);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const { error: e2 } = await admin.from("ad_media").update({ is_cover: true }).eq("id", mediaId);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
