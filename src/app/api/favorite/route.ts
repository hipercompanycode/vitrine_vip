import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { apiError, GENERIC_ERROR } from "@/lib/http";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const { data: existing } = await supabase
    .from("favorites").select("id").eq("ad_id", adId).eq("user_id", user.id).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) return apiError(GENERIC_ERROR, 400, error);
    return NextResponse.json({ active: false });
  }
  const { error } = await supabase.from("favorites").insert({ ad_id: adId, user_id: user.id });
  if (error) return apiError("Não foi possível favoritar agora.", 403, error);
  return NextResponse.json({ active: true });
}
