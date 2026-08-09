import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { remaining, type MediaKind } from "@/lib/media";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const storagePath = String(form.get("storage_path") ?? "");
  const type = String(form.get("type") ?? "") as MediaKind;
  if (!adId || !storagePath || (type !== "photo" && type !== "video")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  // dono do anúncio?
  const { data: ad } = await admin.from("ads").select("id, profile_id").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  // limites do plano ativo (fallback Básico: 6 fotos / 1 vídeo)
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plans ( max_photos, max_videos )")
    .eq("profile_id", user.id).eq("status", "active").maybeSingle();
  const plan = (sub?.plans as unknown as { max_photos: number; max_videos: number } | null);
  const maxPhotos = plan?.max_photos ?? 6;
  const maxVideos = plan?.max_videos ?? 1;

  // contagem atual
  const { data: rows } = await admin.from("ad_media").select("type").eq("ad_id", adId);
  const photos = (rows ?? []).filter((r: { type: string }) => r.type === "photo").length;
  const videos = (rows ?? []).filter((r: { type: string }) => r.type === "video").length;
  if (remaining(type, maxPhotos, maxVideos, photos, videos) <= 0) {
    return NextResponse.json({ error: "limite do plano atingido" }, { status: 409 });
  }

  const position = (rows ?? []).length;
  const isFirstPhoto = type === "photo" && photos === 0;
  const { data: inserted, error } = await admin
    .from("ad_media")
    .insert({ ad_id: adId, type, storage_path: storagePath, position, is_cover: isFirstPhoto })
    .select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: inserted.id });
}
