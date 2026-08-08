import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { parsePriceToCents } from "@/lib/price";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();

  if (!title) return NextResponse.json({ error: "título obrigatório" }, { status: 400 });

  const price_cents = parsePriceToCents(String(form.get("price") ?? ""));
  if (price_cents === null) return NextResponse.json({ error: "preço inválido" }, { status: 400 });

  const cityRaw = form.get("city_id");
  const cityIdNum = cityRaw ? Number(cityRaw) : null;
  const cityId = cityIdNum !== null && Number.isNaN(cityIdNum) ? null : cityIdNum;

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
