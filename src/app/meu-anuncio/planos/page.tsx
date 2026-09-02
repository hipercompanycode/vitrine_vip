import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { planForProfile } from "@/lib/access";
import PlanCards from "@/components/PlanCards";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Planos", robots: { index: false, follow: false } };

export default async function MeusPlanosPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/planos");

  const admin = createAdminClient();
  const plan = await planForProfile(admin, user.id);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link href="/meu-anuncio" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Voltar
          </Link>
          <span className="ml-auto inline-flex items-baseline gap-0.5">
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-pop">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 16l-2-9 5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 2h14v2H5v-2z" /></svg>
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Turbine seu anúncio</h1>
          <p className="mx-auto mt-1.5 max-w-xl text-sm text-muted">
            {plan.slug === "free"
              ? "No Grátis você já aparece na vitrine. Assine Pro ou Premium para liberar story, áudio, “disponível agora”, subir ao topo, selo de destaque e mais fotos."
              : `Seu plano ${plan.name} está ativo. Veja o que muda entre os planos.`}
          </p>
        </div>

        <PlanCards currentSlug={plan.slug} />

        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted/80">
          Pagamento via Pix — cada assinatura vale 30 dias (renovação manual). O Grátis é vitalício e continua disponível a qualquer momento.
        </p>
      </main>
    </>
  );
}
