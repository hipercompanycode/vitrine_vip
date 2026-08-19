import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const docPath = String(form.get("doc_path") ?? "");
  const videoPath = String(form.get("video_path") ?? "");
  if (!docPath || !videoPath) return NextResponse.json({ error: "envie documento e vídeo" }, { status: 400 });
  // segurança: os arquivos têm que estar na pasta do próprio usuário
  if (!docPath.startsWith(`${user.id}/`) || !videoPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "caminho inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("verifications").upsert(
    { profile_id: user.id, doc_path: docPath, video_path: videoPath, status: "pending", reviewed_at: null },
    { onConflict: "profile_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
