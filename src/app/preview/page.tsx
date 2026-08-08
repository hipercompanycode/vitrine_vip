// TEMPORÁRIO — preview visual com dados fake (sem Supabase). Espelha a home real.
// Remover antes de finalizar.
import AdCard from "@/components/AdCard";
import SiteHeader from "@/components/SiteHeader";
import HomeFilters from "@/components/HomeFilters";
import PreviewNav from "@/components/PreviewNav";
import { getPreviewAds } from "./mock";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  const now = new Date();
  const ads = getPreviewAds();
  return (
    <>
      <PreviewNav active="home" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        <section className="py-7 sm:py-10">
          <h1 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Serviços perto
            <br className="hidden sm:block" /> de você
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted sm:text-base">
            Encontre quem resolve — ou anuncie o seu. Contato direto, sem intermediário.
          </p>
          <div className="mt-5 sm:mt-6">
            <HomeFilters />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Anúncios recentes</h2>
            <span className="text-xs text-muted">{ads.length} resultados</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad, i) => (
              <AdCard key={ad.id} ad={ad} now={now} index={i} hrefBase="/preview/anuncio" />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
