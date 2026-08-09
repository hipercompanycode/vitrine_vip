import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions").select("stripe_customer_id").eq("profile_id", user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "sem assinatura de cartão" }, { status: 400 });

  const origin = new URL(request.url).origin;
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id as string,
    return_url: `${origin}/perfil`,
  });
  return NextResponse.json({ url: portal.url });
}
