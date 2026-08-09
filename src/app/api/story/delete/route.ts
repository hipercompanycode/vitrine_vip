import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("profile_id").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const { data: olds } = await admin.from("stories").select("id, storage_path").eq("ad_id", adId);
  for (const o of olds ?? []) {
    const p = o.storage_path as string;
    if (p.startsWith(`${user.id}/${adId}/`)) await admin.storage.from("ad-media").remove([p]);
  }
  await admin.from("stories").delete().eq("ad_id", adId);
  return NextResponse.json({ ok: true });
}
