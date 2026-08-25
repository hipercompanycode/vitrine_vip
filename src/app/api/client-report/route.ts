import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { accountAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { apiError, GENERIC_ERROR } from "@/lib/http";
import { normalizePhone, isValidPhone, isValidCategory } from "@/lib/client-reports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();

  // Só anunciante verificado pode relatar (rede fechada entre profissionais).
  const { verifApproved } = await accountAccess(admin, user.id);
  if (!verifApproved) {
    return NextResponse.json({ error: "Disponível só para anunciantes verificados." }, { status: 403 });
  }

  const rl = rateLimit(clientKey(request, user.id) + ":creport", 10, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Muitos relatos. Tente mais tarde." }, { status: 429 });

  const form = await request.formData();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const category = String(form.get("category") ?? "");
  const description = String(form.get("description") ?? "").trim().slice(0, 1000);
  const photoPath = String(form.get("photo_path") ?? "").trim() || null;

  if (!isValidPhone(phone)) return NextResponse.json({ error: "Informe um telefone válido (com DDD)." }, { status: 400 });
  if (!isValidCategory(category)) return NextResponse.json({ error: "Escolha o motivo." }, { status: 400 });
  if (description.length < 15) return NextResponse.json({ error: "Descreva o que aconteceu (mín. 15 caracteres)." }, { status: 400 });
  // a foto (se enviada) tem que estar na pasta do próprio usuário
  if (photoPath && !photoPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "caminho inválido" }, { status: 400 });
  }

  const { error } = await admin.from("client_reports").insert({
    phone, reporter_id: user.id, category, description, photo_path: photoPath, status: "pending",
  });
  if (error) return apiError(GENERIC_ERROR, 500, error);
  return NextResponse.json({ ok: true });
}
