import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { flash, GENERIC_ERROR } from "@/lib/http";
import { makeBlur, deleteBlur } from "@/lib/blur";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const mediaId = String(form.get("media_id") ?? "");
  const action = String(form.get("action") ?? "");
  const back = String(form.get("back") ?? "/admin/fotos");
  const safeBack = back.startsWith("/admin") ? back : "/admin/fotos";
  if (!mediaId || !["liberar", "nudez", "excluir"].includes(action)) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: m } = await admin.from("ad_media").select("id, storage_path, blur_path, ads ( profile_id )").eq("id", mediaId).maybeSingle();
  if (!m) return flash(request, safeBack, "erro", "Foto não encontrada.");
  const adRel = Array.isArray((m as any).ads) ? (m as any).ads[0] : (m as any).ads;
  const ownerId = (adRel?.profile_id as string | undefined) ?? "";
  const notifyPhoto = (title: string, body: string) => notify(admin, ownerId, { kind: "moderation", title, body, href: "/meu-anuncio/fotos" });

  if (action === "excluir") {
    const paths = [m.storage_path as string, m.blur_path as string | null].filter(Boolean) as string[];
    if (paths.length) await admin.storage.from("ad-media").remove(paths);
    await admin.from("ad_media").delete().eq("id", mediaId);
    await notifyPhoto("Foto removida", "A moderação removeu uma foto do seu anúncio.");
    return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
  }

  if (action === "liberar") {
    await deleteBlur(admin, m.blur_path as string | null);
    await admin.from("ad_media").update({ review: "liberada", blur_path: null }).eq("id", mediaId);
    await notifyPhoto("Foto aprovada", "Sua foto foi liberada e está visível no anúncio.");
    return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
  }

  // nudez: gera a cópia borrada e marca
  const blurPath = m.blur_path ?? (await makeBlur(admin, m.storage_path as string));
  const { error } = await admin.from("ad_media").update({ review: "nudez", blur_path: blurPath }).eq("id", mediaId);
  if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);
  await notifyPhoto("Foto marcada como sensível", "Uma foto sua passou a aparecer só para maiores verificados (borrada no acesso geral).");
  return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
}
