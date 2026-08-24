import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { apiError, GENERIC_ERROR } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const rl = rateLimit(clientKey(request, user.id) + ":verif", 8, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Muitos envios. Tente mais tarde." }, { status: 429 });

  const form = await request.formData();
  const docPath = String(form.get("doc_path") ?? "");
  const facePath = String(form.get("face_path") ?? "");
  const bodyPath = String(form.get("body_path") ?? "");
  if (!docPath || !facePath || !bodyPath) return NextResponse.json({ error: "envie documento, foto do rosto e foto de corpo" }, { status: 400 });
  // segurança: os arquivos têm que estar na pasta do próprio usuário
  if (![docPath, facePath, bodyPath].every((p) => p.startsWith(`${user.id}/`))) {
    return NextResponse.json({ error: "caminho inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("verifications").upsert(
    { profile_id: user.id, doc_path: docPath, face_path: facePath, body_path: bodyPath, video_path: null, status: "pending", reviewed_at: null },
    { onConflict: "profile_id" }
  );
  if (error) return apiError(GENERIC_ERROR, 500, error);
  return NextResponse.json({ ok: true });
}
