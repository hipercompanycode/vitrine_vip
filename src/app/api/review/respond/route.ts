import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { apiError, GENERIC_ERROR } from "@/lib/http";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const reviewId = String(form.get("review_id") ?? "");
  const action = String(form.get("action") ?? "");
  if (!reviewId || !["responder", "aprovar", "moderar"].includes(action)) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  // a avaliação tem que ser de um anúncio DO próprio usuário
  const { data: r } = await admin.from("reviews").select("id, status, ads ( profile_id )").eq("id", reviewId).maybeSingle();
  const ownerId = (Array.isArray(r?.ads) ? r?.ads[0] : r?.ads)?.profile_id as string | undefined;
  if (!r || ownerId !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  if (r.status !== "aguardando") return NextResponse.json({ ok: true, already: true });

  const nowIso = new Date().toISOString();
  if (action === "responder") {
    const reply = String(form.get("reply") ?? "").trim().slice(0, 1000);
    if (reply.length < 2) return NextResponse.json({ error: "Escreva a resposta." }, { status: 400 });
    const { error } = await admin.from("reviews").update({ reply, reply_at: nowIso, status: "publicada" }).eq("id", reviewId);
    if (error) return apiError(GENERIC_ERROR, 500, error);
  } else if (action === "aprovar") {
    await admin.from("reviews").update({ status: "publicada" }).eq("id", reviewId);
  } else {
    await admin.from("reviews").update({ status: "moderacao", moderation_at: nowIso }).eq("id", reviewId);
  }
  return NextResponse.json({ ok: true });
}
