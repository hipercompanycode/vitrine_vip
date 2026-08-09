import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { slug } = await request.json().catch(() => ({ slug: "" }));
  if (!slug) return NextResponse.json({ error: "plano inválido" }, { status: 400 });

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans").select("id, name, price_cents, stripe_price_id").eq("slug", slug).maybeSingle();
  if (!plan || !plan.stripe_price_id) {
    return NextResponse.json({ error: "plano indisponível" }, { status: 400 });
  }

  // reusa o customer da assinatura existente; senão cria
  const { data: existing } = await admin
    .from("subscriptions").select("stripe_customer_id").eq("profile_id", user.id).maybeSingle();
  let customerId = (existing?.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined, metadata: { profile_id: user.id },
    });
    customerId = customer.id;
  }

  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripe_price_id as string }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: { profile_id: user.id, plan_id: String(plan.id), method: "card" },
  });

  await admin.from("subscriptions").upsert(
    { profile_id: user.id, plan_id: plan.id, method: "card", stripe_customer_id: customerId },
    { onConflict: "profile_id" }
  );

  const invoice = sub.latest_invoice as unknown as { payment_intent?: { client_secret?: string } };
  const clientSecret = invoice?.payment_intent?.client_secret;
  if (!clientSecret) return NextResponse.json({ error: "falha ao iniciar pagamento" }, { status: 500 });
  return NextResponse.json({ clientSecret, subscriptionId: sub.id });
}
