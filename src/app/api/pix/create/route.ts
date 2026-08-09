import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { slug } = await request.json().catch(() => ({ slug: "" }));
  const admin = createAdminClient();
  const { data: plan } = await admin.from("plans").select("id, price_cents").eq("slug", slug).maybeSingle();
  if (!plan) return NextResponse.json({ error: "plano inválido" }, { status: 400 });

  const pi = await stripe.paymentIntents.create({
    amount: plan.price_cents as number,
    currency: "brl",
    payment_method_types: ["pix"],
    metadata: { profile_id: user.id, plan_id: String(plan.id), method: "pix" },
  });

  await admin.from("subscriptions").upsert(
    { profile_id: user.id, plan_id: plan.id, method: "pix" },
    { onConflict: "profile_id" }
  );

  return NextResponse.json({ clientSecret: pi.client_secret });
}
