import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PixCheckout from "@/components/PixCheckout";
import { PLANS } from "@/lib/plans";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { userHasAd } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function AssinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = PLANS.find((p) => p.slug === slug);
  if (!plan) notFound();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasAd = user ? await userHasAd(createAdminClient(), user.id) : false;
  return (
    <>
      <SiteHeader loggedIn={!!user} hasAd={hasAd} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Assinar {plan.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {(plan.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} via Pix — vale 30 dias.
        </p>
        <div className="mt-6"><PixCheckout plans={PLANS} fixedSlug={plan.slug} /></div>
      </main>
    </>
  );
}
