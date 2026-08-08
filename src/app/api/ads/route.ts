import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const priceReais = Number(String(form.get("price") ?? "0").replace(",", "."));
  const cityId = form.get("city_id") ? Number(form.get("city_id")) : null;

  if (!title) return NextResponse.json({ error: "título obrigatório" }, { status: 400 });
  const price_cents = Math.max(0, Math.round(priceReais * 100));

  const admin = createAdminClient();
  // upsert do anúncio único (profile_id unique)
  const { error } = await admin
    .from("ads")
    .upsert(
      { profile_id: user.id, title, description, price_cents, city_id: cityId, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
