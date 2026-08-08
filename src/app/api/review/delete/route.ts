import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const reviewId = String(form.get("review_id") ?? "");
  const adId = String(form.get("ad_id") ?? "");
  if (!reviewId) return NextResponse.json({ error: "review_id obrigatório" }, { status: 400 });

  await supabase.from("reviews").delete().eq("id", reviewId).eq("user_id", user.id);
  return NextResponse.redirect(new URL(`/anuncio/${adId}`, request.url), { status: 303 });
}
