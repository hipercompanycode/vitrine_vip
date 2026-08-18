// TEMPORÁRIO — preview do layout de vitrine (dados fake, sem Supabase). Fotos = placeholder.
import SiteHeader from "@/components/SiteHeader";
import HomeFilters from "@/components/HomeFilters";
import PreviewNav from "@/components/PreviewNav";
import ProfileCard from "@/components/ProfileCard";
import { getVitrineProfiles, VITRINE_TIME_BUCKETS } from "./vitrine-mock";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  const profiles = getVitrineProfiles();
  return (
    <>
      <PreviewNav active="home" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <section className="py-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Acompanhantes em <span className="text-accent">Indaiatuba</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Perfis verificados perto de você — contato direto, sem intermediário.</p>
          <div className="mt-4">
            <HomeFilters cityLabel="Indaiatuba - SP" nearby={true} />
          </div>
        </section>

        <section className="flex gap-3">
          {/* Coluna "Faz X minutos" (timeline) */}
          <aside className="hidden w-16 shrink-0 md:block">
            <div className="sticky top-20 flex flex-col gap-3">
              {VITRINE_TIME_BUCKETS.map((t) => (
                <div key={t} className="rounded-md bg-[#f2c94c] px-1.5 py-2 text-center text-[10px] font-bold leading-tight text-black shadow-card">
                  <span className="block text-[9px] font-semibold uppercase tracking-wide text-black/70">Faz</span>
                  {t}
                </div>
              ))}
            </div>
          </aside>

          {/* Grid masonry de perfis */}
          <div className="min-w-0 flex-1">
            <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6">
              {profiles.map((p) => (
                <ProfileCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
