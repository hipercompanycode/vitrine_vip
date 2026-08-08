import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import AdCard, { type AdCardData } from "@/components/AdCard";
import SiteHeader from "@/components/SiteHeader";
import HomeFilters from "@/components/HomeFilters";

export const dynamic = "force-dynamic";

type CityEmbed = { name: string; uf: string };
type ProfileEmbed = { whatsapp: string };
type AdRow = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  is_available: boolean;
  created_at: string;
  cities: CityEmbed | CityEmbed[] | null;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

export default async function Home() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // anúncios visíveis: status active + assinatura ativa.
  // Não há FK direta ads <-> subscriptions (só via profiles), então consulta em 2 etapas.
  const { data: activeSubs, error: activeSubsError } = await admin
    .from("subscriptions")
    .select("profile_id")
    .eq("status", "active")
    .gt("current_period_end", nowIso);
  if (activeSubsError) console.error("home subscriptions query:", activeSubsError.message);

  const activeProfileIds = Array.from(
    new Set(((activeSubs ?? []) as { profile_id: string }[]).map((s) => s.profile_id))
  );

  let data: AdRow[] = [];
  if (activeProfileIds.length > 0) {
    const res = await admin
      .from("ads")
      .select(`
        id, title, description, price_cents, is_available, created_at,
        cities ( name, uf ),
        profiles ( whatsapp )
      `)
      .eq("status", "active")
      .in("profile_id", activeProfileIds)
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (res.error) console.error("home ads query:", res.error.message);
    data = (res.data ?? []) as unknown as AdRow[];
  }

  const now = new Date();
  const ads: AdCardData[] = data.map((r) => {
    const city = (Array.isArray(r.cities) ? r.cities[0] : r.cities) ?? null;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      price_cents: r.price_cents,
      is_available: r.is_available,
      created_at: r.created_at,
      city: city ? { name: city.name, uf: city.uf } : null,
      whatsapp: profile?.whatsapp ?? "",
    };
  });

  if (ads.length > 0) {
    const ids = ads.map((a) => a.id);
    const { data: likeRows } = await admin.from("likes").select("ad_id").in("ad_id", ids);
    const counts = new Map<string, number>();
    (likeRows ?? []).forEach((r: { ad_id: string }) => counts.set(r.ad_id, (counts.get(r.ad_id) ?? 0) + 1));
    ads.forEach((a) => { a.like_count = counts.get(a.id) ?? 0; });
  }

  return (
    <>
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
            {ads.length > 0 && (
              <span className="text-xs text-muted">{ads.length} resultado{ads.length > 1 ? "s" : ""}</span>
            )}
          </div>

          {ads.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad, i) => (
                <AdCard key={ad.id} ad={ad} now={now} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-display text-lg font-bold text-ink">Nenhum anúncio por aqui ainda</p>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Seja o primeiro a divulgar seu serviço nesta cidade.
      </p>
      <Link
        href="/perfil"
        className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-95"
      >
        Criar meu anúncio
      </Link>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row">
        <span className="font-display font-bold text-ink">
          serviços<span className="text-accent">.</span>
        </span>
        <span>Contato direto via WhatsApp · anúncios locais</span>
      </div>
    </footer>
  );
}
