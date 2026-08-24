import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { apiError, GENERIC_ERROR } from "@/lib/http";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const rl = rateLimit(clientKey(request, user.id) + ":like", 40, 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Aguarde um pouco." }, { status: 429 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const { data: existing } = await supabase
    .from("likes").select("id").eq("ad_id", adId).eq("user_id", user.id).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);
    if (error) return apiError(GENERIC_ERROR, 400, error);
    return NextResponse.json({ active: false });
  }
  const { error } = await supabase.from("likes").insert({ ad_id: adId, user_id: user.id });
  if (error) return apiError("Não foi possível curtir agora.", 403, error);
  return NextResponse.json({ active: true });
}
