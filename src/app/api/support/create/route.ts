import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { flash, GENERIC_ERROR } from "@/lib/http";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return flash(request, "/login?next=/suporte", "erro", "Entre na sua conta para falar com o suporte.");

  const rl = rateLimit(clientKey(request, user.id) + ":support", 12, 60 * 60 * 1000);
  if (!rl.ok) return flash(request, "/suporte", "erro", "Muitas mensagens em pouco tempo. Tente mais tarde.");

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "mensagem") === "chat" ? "chat" : "mensagem";
  const subject = String(form.get("subject") ?? "").trim().slice(0, 120) || null;
  const message = String(form.get("message") ?? "").trim().slice(0, 2000);
  if (message.length < 3) return flash(request, "/suporte", "erro", "Escreva sua mensagem.");

  const admin = createAdminClient();
  const { data: t, error } = await admin.from("support_tickets")
    .insert({ profile_id: user.id, kind, subject })
    .select("id").single();
  if (error || !t) return flash(request, "/suporte", "erro", GENERIC_ERROR, error ?? undefined);
  await admin.from("support_messages").insert({ ticket_id: t.id, from_admin: false, body: message });

  const kindMsg = kind === "chat" ? "Chat aberto! Responderemos por aqui." : "Mensagem enviada! Responderemos por aqui.";
  return flash(request, `/suporte?t=${t.id}`, "ok", kindMsg);
}
