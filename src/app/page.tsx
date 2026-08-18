import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import SiteHeader from "@/components/SiteHeader";
import HomeFilters from "@/components/HomeFilters";

export const dynamic = "force-dynamic";

const TIME_BUCKETS = ["5 Minutos", "15 Minutos", "25 Minutos", "35 Minutos", "45 Minutos", "1 Hora"];
const RATIOS: NonNullable<ProfileCardData["ratio"]>[] = ["portrait", "tall", "square", "tall", "portrait", "square"];

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

type CityEmbed = { name: string; uf: string };
type ProfileEmbed = { name: string; whatsapp: string };
type AdRow = {
  id: string;
  title: string;
  description: string;
  is_available: boolean;
  created_at: string;
  cities: CityEmbed | CityEmbed[] | null;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

export default async function Home() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Visibilidade: assinatura ativa. featured = plano premium.
  const { data: activeSubs, error: activeSubsError } = await admin
    .from("subscriptions")
    .select("profile_id, plans ( slug )")
    .eq("status", "active")
    .gt("current_period_end", nowIso);
  if (activeSubsError) console.error("home subscriptions query:", activeSubsError.message);

  const planByProfile = new Map<string, string>();
  ((activeSubs ?? []) as { profile_id: string; plans: { slug: string } | { slug: string }[] | null }[]).forEach((s) => {
    const plan = Array.isArray(s.plans) ? s.plans[0] : s.plans;
    if (plan?.slug) planByProfile.set(s.profile_id, plan.slug);
  });
  const activeProfileIds = Array.from(planByProfile.keys());

  // Filtro geo (cookies city_id/nearby).
  const jar = await cookies();
  const cityIdRaw = jar.get("city_id")?.value;
  const cityId = cityIdRaw && Number.isFinite(Number(cityIdRaw)) ? Number(cityIdRaw) : null;
  const nearby = (jar.get("nearby")?.value ?? "1") !== "0";

  let cityFilter: number[] | null = null;
  let cityLabel: string | undefined;
  if (cityId) {
    const { data: cityRow } = await admin.from("cities").select("name, uf").eq("id", cityId).maybeSingle();
    if (cityRow) cityLabel = `${cityRow.name} - ${cityRow.uf}`;
    if (nearby) {
      const { data: ids } = await admin.rpc("nearby_city_ids", { p_city_id: cityId, p_km: 100 });
      cityFilter = (ids ?? []).map((r: any) => (typeof r === "number" ? r : r.nearby_city_ids ?? r.id));
    } else {
      cityFilter = [cityId];
    }
  }

  let data: AdRow[] = [];
  const profileOf = new Map<string, string>(); // ad_id -> profile_id
  if (activeProfileIds.length > 0) {
    let query = admin
      .from("ads")
      .select(`id, title, description, is_available, created_at, profile_id, cities ( name, uf ), profiles ( name, whatsapp )`)
      .eq("status", "active")
      .in("profile_id", activeProfileIds);
    if (cityFilter) query = query.in("city_id", cityFilter);
    const res = await query
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (res.error) console.error("home ads query:", res.error.message);
    data = (res.data ?? []) as unknown as AdRow[];
    (res.data ?? []).forEach((r: any) => profileOf.set(r.id, r.profile_id));
  }

  const ids = data.map((r) => r.id);

  // age/verified (query separada e tolerante: se a migration 0008 ainda não rodou, usa defaults)
  const ageVerified = new Map<string, { age: number | null; verified: boolean }>();
  if (ids.length > 0) {
    const av = await admin.from("ads").select("id, age, verified").in("id", ids);
    if (!av.error) (av.data ?? []).forEach((r: any) => ageVerified.set(r.id, { age: r.age ?? null, verified: !!r.verified }));
  }

  // contagem de vídeos por anúncio
  const videoCount = new Map<string, number>();
  // stories ativas -> play + "Gravada às"
  const story = new Map<string, string>(); // ad_id -> created_at
  if (ids.length > 0) {
    const [vids, stories] = await Promise.all([
      admin.from("ad_media").select("ad_id").eq("type", "video").in("ad_id", ids),
      admin.from("stories").select("ad_id, created_at").in("ad_id", ids).gt("expires_at", nowIso),
    ]);
    (vids.data ?? []).forEach((r: any) => videoCount.set(r.ad_id, (videoCount.get(r.ad_id) ?? 0) + 1));
    (stories.data ?? []).forEach((r: any) => { if (!story.has(r.ad_id)) story.set(r.ad_id, r.created_at); });
  }

  const profiles: ProfileCardData[] = data.map((r, i) => {
    const city = (Array.isArray(r.cities) ? r.cities[0] : r.cities) ?? null;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const av = ageVerified.get(r.id) ?? { age: null, verified: false };
    const vc = videoCount.get(r.id) ?? 0;
    const storyAt = story.get(r.id);
    const slug = planByProfile.get(profileOf.get(r.id) ?? "") ?? "";
    return {
      id: r.id,
      name: profile?.name?.trim() || r.title,
      age: av.age ?? 0,
      city: city ? `${city.name}` : "",
      description: r.description,
      verified: av.verified,
      videoCount: vc,
      hasVideo: vc > 0 || !!storyAt,
      recordedAt: storyAt ? hhmm(storyAt) : null,
      featured: slug === "premium",
      hue: hueFromId(r.id),
      ratio: RATIOS[i % RATIOS.length],
    };
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <section className="py-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Acompanhantes {cityLabel ? <>em <span className="text-accent">{cityLabel.replace(" - ", "-")}</span></> : <>perto de <span className="text-accent">você</span></>}
          </h1>
          <p className="mt-1 text-sm text-muted">Perfis verificados perto de você — contato direto, sem intermediário.</p>
          <div className="mt-4">
            <HomeFilters cityLabel={cityLabel} nearby={nearby} />
          </div>
        </section>

        <section className="flex gap-3">
          <aside className="hidden w-16 shrink-0 md:block">
            <div className="sticky top-20 flex flex-col gap-3">
              {TIME_BUCKETS.map((t) => (
                <div key={t} className="rounded-md bg-[#f2c94c] px-1.5 py-2 text-center text-[10px] font-bold leading-tight text-black shadow-card">
                  <span className="block text-[9px] font-semibold uppercase tracking-wide text-black/70">Faz</span>
                  {t}
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {profiles.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6">
                {profiles.map((p) => (
                  <ProfileCard key={p.id} p={p} hrefBase="/anuncio" />
                ))}
              </div>
            )}
          </div>
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
      <p className="mt-1 max-w-xs text-sm text-muted">Seja a primeira a divulgar seu perfil nesta cidade.</p>
      <Link href="/perfil" className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-95">
        Criar meu anúncio
      </Link>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row">
        <span className="font-display font-bold text-ink">
          serviços<span className="text-accent">.</span>
        </span>
        <span>Contato direto via WhatsApp · anúncios locais</span>
      </div>
    </footer>
  );
}
