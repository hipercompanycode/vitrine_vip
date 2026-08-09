// Seed de teste: cria usuários confirmados + anúncio visível (assinatura ativa).
// Uso: node --env-file=.env.local scripts/seed-test.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("faltam envs NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, key, { auth: { persistSession: false } });
const PASS = "Teste12345!";

async function makeUser(email, role, name) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASS, email_confirm: true, user_metadata: { role },
  });
  if (error) {
    if (String(error.message).toLowerCase().includes("already")) {
      const { data: list } = await admin.auth.admin.listUsers();
      const found = list.users.find((u) => u.email === email);
      if (found) { await admin.from("profiles").update({ name }).eq("id", found.id); return found.id; }
    }
    throw error;
  }
  await admin.from("profiles").update({ name }).eq("id", data.user.id);
  return data.user.id;
}

// 1) Anunciante + anúncio + assinatura ativa
const advId = await makeUser("anunciante.teste@exemplo.com", "anunciante", "Serviços do João");
await admin.from("profiles").update({ whatsapp: "5511999990001", city_id: 1 }).eq("id", advId);

const { data: existingAd } = await admin.from("ads").select("id").eq("profile_id", advId).maybeSingle();
let adId = existingAd?.id;
if (!adId) {
  const { data: ad, error: ae } = await admin.from("ads").insert({
    profile_id: advId, title: "Eletricista 24h",
    description: "Instalações, reparos e emergências. Atendimento rápido em toda a região, orçamento sem compromisso.",
    price_cents: 12000, city_id: 1, is_available: true, status: "active",
    bumped_at: new Date().toISOString(),
  }).select("id").single();
  if (ae) throw ae;
  adId = ad.id;
}

const { data: plan } = await admin.from("plans").select("id").eq("slug", "pro").single();
const { data: existingSub } = await admin.from("subscriptions").select("id").eq("profile_id", advId).eq("status", "active").maybeSingle();
if (!existingSub) {
  const { error: se } = await admin.from("subscriptions").insert({
    profile_id: advId, plan_id: plan.id, status: "active", method: "card",
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
  if (se) throw se;
}

// 2) Usuário comum (pra curtir/avaliar/denunciar)
const comId = await makeUser("usuario.teste@exemplo.com", "comum", "Maria Cliente");

console.log(JSON.stringify({ advertiser: advId, ad: adId, common: comId, password: PASS }, null, 2));
