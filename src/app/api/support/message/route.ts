import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { flash, GENERIC_ERROR } from "@/lib/http";

// Anunciante manda uma mensagem num ticket existente (continuar a conversa).
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return flash(request, "/login?next=/suporte", "erro", "Entre na sua conta.");

  const rl = rateLimit(clientKey(request, user.id) + ":supmsg", 40, 60 * 60 * 1000);
  if (!rl.ok) return flash(request, "/suporte", "erro", "Devagar aí — muitas mensagens.");

  const form = await request.formData();
  const ticketId = String(form.get("ticket_id") ?? "");
  const body = String(form.get("message") ?? "").trim().slice(0, 2000);
  if (!ticketId || body.length < 1) return flash(request, `/suporte?t=${ticketId}`, "erro", "Escreva sua mensagem.");

  const admin = createAdminClient();
  const { data: t } = await admin.from("support_tickets").select("id, profile_id").eq("id", ticketId).maybeSingle();
  if (!t || t.profile_id !== user.id) return flash(request, "/suporte", "erro", "Atendimento não encontrado.");

  const { error } = await admin.from("support_messages").insert({ ticket_id: ticketId, from_admin: false, body });
  if (error) return flash(request, `/suporte?t=${ticketId}`, "erro", GENERIC_ERROR, error);
  await admin.from("support_tickets").update({ status: "aberto", updated_at: new Date().toISOString() }).eq("id", ticketId);

  return NextResponse.redirect(new URL(`/suporte?t=${ticketId}`, request.url), { status: 303 });
}
