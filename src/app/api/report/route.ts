import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isValidReason } from "@/lib/interactions";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const rl = rateLimit(clientKey(request, user.id) + ":report", 5, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Muitas denúncias em pouco tempo. Tente mais tarde." }, { status: 429 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const reason = String(form.get("reason") ?? "");
  const detailsRaw = String(form.get("details") ?? "").trim();
  const details = detailsRaw === "" ? null : detailsRaw;

  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });
  if (!isValidReason(reason)) return NextResponse.json({ error: "motivo inválido" }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    ad_id: adId, user_id: user.id, reason, details,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.redirect(new URL(`/anuncio/${adId}`, request.url), { status: 303 });
}
