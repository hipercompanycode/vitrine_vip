// Cria (idempotente por lookup_key) 1 Product + 1 Price recorrente mensal BRL por plano
// e grava plans.stripe_price_id. Uso: node scripts/stripe-setup.mjs
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: plans, error } = await supabase.from("plans").select("id, slug, name, price_cents").order("id");
if (error) throw error;

for (const plan of plans) {
  const lookup = `plan_${plan.slug}_monthly`;
  const found = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  let priceId = found.data[0]?.id;
  if (!priceId) {
    const product = await stripe.products.create({ name: `Plano ${plan.name}`, metadata: { slug: plan.slug } });
    const price = await stripe.prices.create({
      product: product.id, unit_amount: plan.price_cents, currency: "brl",
      recurring: { interval: "month" }, lookup_key: lookup,
    });
    priceId = price.id;
  }
  const up = await supabase.from("plans").update({ stripe_price_id: priceId }).eq("id", plan.id);
  if (up.error) throw up.error;
  console.log(`${plan.slug} -> ${priceId}`);
}
console.log("stripe-setup: done");
