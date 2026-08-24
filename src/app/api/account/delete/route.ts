import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { apiError, GENERIC_ERROR } from "@/lib/http";

export const runtime = "nodejs";

// Exclusão de conta (LGPD): remove tudo do perfil — banco, arquivos e assinatura.
export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const uid = user.id;
  const admin = createAdminClient();

  // 1) coletar caminhos de storage antes de apagar as linhas
  const [{ data: ad }, { data: verif }] = await Promise.all([
    admin.from("ads").select("id").eq("profile_id", uid).maybeSingle(),
    admin.from("verifications").select("doc_path, face_path, body_path").eq("profile_id", uid).maybeSingle(),
  ]);
  const adMediaPaths: string[] = [];
  if (ad?.id) {
    const [{ data: media }, { data: stories }] = await Promise.all([
      admin.from("ad_media").select("storage_path").eq("ad_id", ad.id),
      admin.from("stories").select("storage_path").eq("ad_id", ad.id),
    ]);
    (media ?? []).forEach((m: any) => m.storage_path && adMediaPaths.push(m.storage_path));
    (stories ?? []).forEach((s: any) => s.storage_path && adMediaPaths.push(s.storage_path));
  }
  const verifPaths = [verif?.doc_path, verif?.face_path, verif?.body_path].filter(Boolean) as string[];

  // 2) apagar arquivos de storage
  try {
    if (adMediaPaths.length) await admin.storage.from("ad-media").remove(adMediaPaths);
    if (verifPaths.length) await admin.storage.from("verifications").remove(verifPaths);
  } catch (e) {
    console.error("storage remove on delete:", (e as Error).message);
  }

  // 4) apagar o usuário — cascata (profiles -> subscriptions/ads/verifications; ads -> mídia/likes/favoritos/reviews/reports)
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return apiError(GENERIC_ERROR, 500, error);

  // 5) encerrar sessão
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
