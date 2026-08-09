import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SubscribeForm from "@/components/SubscribeForm";
import { PLANS } from "@/lib/plans";

export default async function AssinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = PLANS.find((p) => p.slug === slug);
  if (!plan) notFound();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Assinar {plan.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {(plan.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — cartão (mensal) ou Pix (30 dias).
        </p>
        <div className="mt-6"><SubscribeForm slug={plan.slug} /></div>
      </main>
    </>
  );
}
