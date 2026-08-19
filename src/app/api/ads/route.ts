import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { parsePriceToCents } from "@/lib/price";
import { sanitizeAttrs } from "@/lib/attributes";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const admin = createAdminClient();

  const nextRaw = String(form.get("next") ?? "/meu-anuncio");
  const next = nextRaw.startsWith("/") ? nextRaw : "/meu-anuncio";

  // Modo "características": atualiza só os atributos do anúncio existente.
  if (form.get("has_attrs") != null) {
    const attributes = sanitizeAttrs(form.getAll("attr").map((v) => String(v)));
    const { error } = await admin.from("ads").update({ attributes, updated_at: new Date().toISOString() }).eq("profile_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.redirect(new URL(next, request.url), { status: 303 });
  }

  // Modo "dados": cria/atualiza os dados básicos (não toca em atributos).
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!title) return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });

  const price_cents = parsePriceToCents(String(form.get("price") ?? ""));
  if (price_cents === null) return NextResponse.json({ error: "preço inválido" }, { status: 400 });

  const cityRaw = form.get("city_id");
  const cityIdNum = cityRaw ? Number(cityRaw) : null;
  const cityId = cityIdNum !== null && Number.isNaN(cityIdNum) ? null : cityIdNum;

  const ageRaw = String(form.get("age") ?? "").trim();
  const ageNum = ageRaw ? Number(ageRaw) : null;
  const age = ageNum !== null && Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 99 ? ageNum : null;

  const { error } = await admin
    .from("ads")
    .upsert(
      { profile_id: user.id, title, description, price_cents, city_id: cityId, age, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
