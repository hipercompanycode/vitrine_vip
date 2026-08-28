import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { parsePriceToCents } from "@/lib/price";
import { sanitizeAttrs } from "@/lib/attributes";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { accountAccess } from "@/lib/access";
import { flash, GENERIC_ERROR } from "@/lib/http";
import { geoFromRequest, recordGeoAndFlag } from "@/lib/geo-ip";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return flash(request, "/login", "erro", "Entre na sua conta para continuar.");

  const rl = rateLimit(clientKey(request, user.id) + ":ads", 40, 60 * 1000);
  if (!rl.ok) return flash(request, "/meu-anuncio", "erro", "Muitas alterações em pouco tempo. Aguarde um instante.");

  const form = await request.formData();
  const admin = createAdminClient();

  const nextRaw = String(form.get("next") ?? "/meu-anuncio");
  const next = nextRaw.startsWith("/") ? nextRaw : "/meu-anuncio";
  const done = () => NextResponse.redirect(new URL(next, request.url), { status: 303 });

  // Depois de aprovado, editar exige assinatura ativa (paywall). Antes da aprovação, é livre (montagem).
  const { active, verifApproved } = await accountAccess(admin, user.id);
  if (verifApproved && !active) {
    return flash(request, "/meu-anuncio", "erro", "Sua assinatura está inativa. Renove para editar o anúncio.");
  }

  // Modo "características": só atributos.
  if (form.get("has_attrs") != null) {
    const attributes = sanitizeAttrs(form.getAll("attr").map((v) => String(v)));
    const { error } = await admin.from("ads").update({ attributes, updated_at: new Date().toISOString() }).eq("profile_id", user.id);
    if (error) return flash(request, next, "erro", GENERIC_ERROR, error);
    return done();
  }

  // Modo "preços": só a tabela de preços (+ menor valor em price_cents).
  if (form.get("has_prices") != null) {
    const labels = form.getAll("price_label").map((v) => String(v).trim());
    const values = form.getAll("price_value").map((v) => String(v));
    const priceTable: { label: string; price_cents: number }[] = [];
    for (let i = 0; i < labels.length; i++) {
      const c = parsePriceToCents(values[i] ?? "");
      if (labels[i] && c !== null && c > 0) priceTable.push({ label: labels[i].slice(0, 60), price_cents: c });
    }
    const price_cents = priceTable.length ? Math.min(...priceTable.map((r) => r.price_cents)) : 0;
    const { error } = await admin.from("ads").update({ price_table: priceTable, price_cents, updated_at: new Date().toISOString() }).eq("profile_id", user.id);
    if (error) return flash(request, next, "erro", GENERIC_ERROR, error);
    return done();
  }

  // Modo "só cidade": atalho rápido — troca apenas a cidade de atendimento.
  if (form.get("has_city") != null) {
    const cityRaw = form.get("city_id");
    const cityIdNum = cityRaw ? Number(cityRaw) : null;
    const cityId = cityIdNum !== null && !Number.isNaN(cityIdNum) ? cityIdNum : null;
    if (cityId == null) return flash(request, next, "erro", "Selecione o estado e a cidade de atendimento.");
    const { error } = await admin.from("ads").update({ city_id: cityId, updated_at: new Date().toISOString() }).eq("profile_id", user.id);
    if (error) return flash(request, next, "erro", GENERIC_ERROR, error);
    try {
      const { data: c } = await admin.from("cities").select("uf").eq("id", cityId).maybeSingle();
      await recordGeoAndFlag(admin, user.id, geoFromRequest(request), (c?.uf as string | null) ?? null);
    } catch (e) { console.error("geo cidade:", e); }
    return flash(request, next, "ok", "Cidade atualizada.");
  }

  // Modo "dados": dados básicos (não toca em preços nem atributos).
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!title) return flash(request, next, "erro", "Informe o nome do anúncio.");

  const headline = String(form.get("headline") ?? "").trim().slice(0, 120);

  const cityRaw = form.get("city_id");
  const cityIdNum = cityRaw ? Number(cityRaw) : null;
  const cityId = cityIdNum !== null && !Number.isNaN(cityIdNum) ? cityIdNum : null;
  if (cityId == null) return flash(request, next, "erro", "Selecione o estado e a cidade de atendimento.");

  const ageRaw = String(form.get("age") ?? "").trim();
  const ageNum = ageRaw ? Number(ageRaw) : null;
  const age = ageNum !== null && Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 99 ? ageNum : null;

  // número nacional (sem 55). O +55 entra só no envio da mensagem.
  let whatsapp = String(form.get("whatsapp") ?? "").replace(/\D/g, "");
  if (whatsapp.length >= 12 && whatsapp.startsWith("55")) whatsapp = whatsapp.slice(2);
  whatsapp = whatsapp.slice(0, 11);
  if (whatsapp) await admin.from("profiles").update({ whatsapp }).eq("id", user.id);

  const contact_whatsapp = form.get("contact_whatsapp") === "1";
  const contact_call = form.get("contact_call") === "1";
  const contact_telegram = form.get("contact_telegram") === "1";

  const { error } = await admin
    .from("ads")
    .upsert(
      { profile_id: user.id, title, description, headline, city_id: cityId, age, contact_whatsapp, contact_call, contact_telegram, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );
  if (error) return flash(request, next, "erro", GENERIC_ERROR, error);

  // sinal de geo por IP (UF do acesso × UF do anúncio) ao salvar os dados
  try {
    const { data: c } = await admin.from("cities").select("uf").eq("id", cityId).maybeSingle();
    await recordGeoAndFlag(admin, user.id, geoFromRequest(request), (c?.uf as string | null) ?? null);
  } catch (e) { console.error("geo ads:", e); }

  return done();
}
