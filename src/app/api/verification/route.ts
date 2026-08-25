import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { apiError, GENERIC_ERROR } from "@/lib/http";
import { isValidCPF, onlyDigitsCpf } from "@/lib/cpf";
import { hashCpf } from "@/lib/cpf-block";
import { dHash } from "@/lib/phash";

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

  const cpf = onlyDigitsCpf(String(form.get("cpf") ?? ""));
  if (!isValidCPF(cpf)) return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 });

  const livenessCode = String(form.get("liveness_code") ?? "").trim().toUpperCase().slice(0, 12).replace(/[^A-Z0-9]/g, "");
  if (livenessCode.length < 4) return NextResponse.json({ error: "Refaça a selfie com o código do papel." }, { status: 400 });

  const admin = createAdminClient();

  // CPF banido (anti-fake) — mensagem propositalmente vaga pra não entregar o motivo.
  const { data: blocked } = await admin.from("blocked_cpfs").select("cpf_hash").eq("cpf_hash", hashCpf(cpf)).maybeSingle();
  if (blocked) {
    return NextResponse.json({ error: "Não foi possível concluir a verificação com esses dados. Se achar que é engano, fale com o suporte." }, { status: 403 });
  }

  // CPF já vinculado a OUTRA conta.
  const { data: other } = await admin.from("verifications").select("profile_id").eq("cpf", cpf).neq("profile_id", user.id).maybeSingle();
  if (other) {
    return NextResponse.json({ error: "Esse CPF já está vinculado a outra conta." }, { status: 409 });
  }

  // "impressão digital" das fotos (best-effort — nunca bloqueia o envio se falhar).
  let faceHash: string | null = null;
  let bodyHash: string | null = null;
  try {
    const [fd, bd] = await Promise.all([
      admin.storage.from("verifications").download(facePath),
      admin.storage.from("verifications").download(bodyPath),
    ]);
    if (fd.data) faceHash = await dHash(Buffer.from(await fd.data.arrayBuffer()));
    if (bd.data) bodyHash = await dHash(Buffer.from(await bd.data.arrayBuffer()));
  } catch (e) {
    console.error("phash verification:", e);
  }

  const { error } = await admin.from("verifications").upsert(
    {
      profile_id: user.id, doc_path: docPath, face_path: facePath, body_path: bodyPath,
      cpf, liveness_code: livenessCode, face_hash: faceHash, body_hash: bodyHash,
      video_path: null, status: "pending", reviewed_at: null,
    },
    { onConflict: "profile_id" }
  );
  if (error) {
    // corrida na unicidade do CPF cai aqui → mensagem amigável
    if (error.code === "23505") return NextResponse.json({ error: "Esse CPF já está vinculado a outra conta." }, { status: 409 });
    return apiError(GENERIC_ERROR, 500, error);
  }
  return NextResponse.json({ ok: true });
}
