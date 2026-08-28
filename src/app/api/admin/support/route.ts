import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { flash, GENERIC_ERROR } from "@/lib/http";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const ticketId = String(form.get("ticket_id") ?? "");
  const action = String(form.get("action") ?? ""); // reply | close | reopen
  if (!ticketId || !["reply", "close", "reopen"].includes(action)) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }
  const back = `/admin/suporte?t=${ticketId}`;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  if (action === "reply") {
    const body = String(form.get("message") ?? "").trim().slice(0, 2000);
    if (body.length < 1) return flash(request, back, "erro", "Escreva a resposta.");
    const { error } = await admin.from("support_messages").insert({ ticket_id: ticketId, from_admin: true, body });
    if (error) return flash(request, back, "erro", GENERIC_ERROR, error);
    await admin.from("support_tickets").update({ status: "aberto", updated_at: nowIso }).eq("id", ticketId);
  } else {
    await admin.from("support_tickets").update({ status: action === "close" ? "fechado" : "aberto", updated_at: nowIso }).eq("id", ticketId);
  }
  return NextResponse.redirect(new URL(back, request.url), { status: 303 });
}
