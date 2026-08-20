import SiteHeader from "@/components/SiteHeader";
import PlanCards from "@/components/PlanCards";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { userHasAd } from "@/lib/ads";

export const metadata = { title: "Planos" };
export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasAd = user ? await userHasAd(createAdminClient(), user.id) : false;
  return (
    <>
      <SiteHeader loggedIn={!!user} hasAd={hasAd} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Escolha seu plano</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Deixe seu anúncio visível na vitrine. Pague no cartão (mensal, renova sozinho) ou Pix (30 dias).</p>
        </div>
        <PlanCards />
        <p className="mt-6 text-center text-xs text-muted">Cancele quando quiser. Sem fidelidade.</p>
      </main>
    </>
  );
}
