import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import VitrineTopBar from "@/components/VitrineTopBar";

export const dynamic = "force-dynamic";

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

export default async function Home({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().replace(/[,%()]/g, " ").slice(0, 60);

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
  const profileOf = new Map<string, string>();
  if (activeProfileIds.length > 0) {
    let query = admin
      .from("ads")
      .select(`id, title, description, is_available, created_at, profile_id, cities ( name, uf ), profiles ( name, whatsapp )`)
      .eq("status", "active")
      .in("profile_id", activeProfileIds);
    if (cityFilter) query = query.in("city_id", cityFilter);
    if (q) query = query.ilike("title", `%${q}%`);
    const res = await query
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (res.error) console.error("home ads query:", res.error.message);
    data = (res.data ?? []) as unknown as AdRow[];
    (res.data ?? []).forEach((r: any) => profileOf.set(r.id, r.profile_id));
  }

  const ids = data.map((r) => r.id);

  const ageVerified = new Map<string, { age: number | null; verified: boolean }>();
  const videoCount = new Map<string, number>();
  const story = new Map<string, string>();
  if (ids.length > 0) {
    const [av, vids, stories] = await Promise.all([
      admin.from("ads").select("id, age, verified").in("id", ids),
      admin.from("ad_media").select("ad_id").eq("type", "video").in("ad_id", ids),
      admin.from("stories").select("ad_id, created_at").in("ad_id", ids).gt("expires_at", nowIso),
    ]);
    if (!av.error) (av.data ?? []).forEach((r: any) => ageVerified.set(r.id, { age: r.age ?? null, verified: !!r.verified }));
    (vids.data ?? []).forEach((r: any) => videoCount.set(r.ad_id, (videoCount.get(r.ad_id) ?? 0) + 1));
    (stories.data ?? []).forEach((r: any) => { if (!story.has(r.ad_id)) story.set(r.ad_id, r.created_at); });
  }

  const profiles: ProfileCardData[] = data.map((r) => {
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
    };
  });

  return (
    <>
      <VitrineTopBar cityLabel={cityLabel} defaultQuery={q} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <section className="py-4">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Acompanhantes {cityLabel ? <>em <span className="text-accent">{cityLabel.replace(" - ", "-")}</span></> : <>perto de <span className="text-accent">você</span></>}
          </h1>
          {q && <p className="mt-0.5 text-sm text-muted">Busca: “{q}” · {profiles.length} resultado{profiles.length === 1 ? "" : "s"}</p>}
        </section>

        {profiles.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {profiles.map((p) => (
              <ProfileCard key={p.id} p={p} hrefBase="/anuncio" />
            ))}
          </div>
        )}
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
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row">
        <span className="font-display font-bold text-ink">
          vitrine<span className="text-accent">.</span>
        </span>
        <span>Perfis verificados · contato direto · anúncios locais</span>
      </div>
    </footer>
  );
}
