import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { mapStripeStatus, pixPeriodEndISO } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "sem assinatura" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `assinatura inválida: ${(e as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    switch (event.type) {
      case "invoice.paid": {
        const inv = event.data.object as unknown as { subscription: string | null };
        if (!inv.subscription) break;
        const sub = (await stripe.subscriptions.retrieve(inv.subscription)) as unknown as {
          id: string;
          customer: string;
          status: string;
          current_period_end: number;
          metadata?: { profile_id?: string; plan_id?: string };
        };
        const profileId = sub.metadata?.profile_id;
        if (!profileId) break;
        await admin.from("subscriptions").upsert({
          profile_id: profileId,
          plan_id: sub.metadata?.plan_id ? Number(sub.metadata.plan_id) : undefined,
          method: "card",
          status: mapStripeStatus(sub.status),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
        }, { onConflict: "profile_id" });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as {
          metadata?: { profile_id?: string }; status: string; current_period_end: number; id: string;
        };
        const profileId = sub.metadata?.profile_id;
        if (!profileId) break;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStripeStatus(sub.status);
        await admin.from("subscriptions").upsert({
          profile_id: profileId,
          method: "card",
          status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_subscription_id: sub.id,
        }, { onConflict: "profile_id" });
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as unknown as {
          metadata?: { method?: string; profile_id?: string; plan_id?: string };
        };
        if (pi.metadata?.method !== "pix" || !pi.metadata?.profile_id) break;
        await admin.from("subscriptions").upsert({
          profile_id: pi.metadata.profile_id,
          plan_id: pi.metadata.plan_id ? Number(pi.metadata.plan_id) : undefined,
          method: "pix",
          status: "active",
          current_period_end: pixPeriodEndISO(new Date()),
          stripe_subscription_id: null,
        }, { onConflict: "profile_id" });
        break;
      }
    }
  } catch (e) {
    console.error("webhook handler:", (e as Error).message);
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
