import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import VitrineTopBar from "@/components/VitrineTopBar";
import { sanitizeAttrs, labelOf } from "@/lib/attributes";
import { cityPath } from "@/lib/seo";
import { userHasAd } from "@/lib/ads";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = !!(sp.q || sp.pmin || sp.pmax || sp.imin || sp.imax || sp.verified || sp.video || sp.attrs || sp.city_id || sp.nearby);
  return { alternates: { canonical: "/" }, robots: filtered ? { index: false, follow: true } : { index: true, follow: true } };
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}
function intParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

type CityEmbed = { name: string; uf: string };
type ProfileEmbed = { name: string; whatsapp: string };
type AdRow = {
  id: string;
  title: string;
  description: string;
  headline: string | null;
  price_cents: number;
  age: number | null;
  verified: boolean | null;
  is_available: boolean;
  created_at: string;
  profile_id: string;
  cities: CityEmbed | CityEmbed[] | null;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

export default async function Home({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const sp = await searchParams;

  const ssr = await createServerClient();

  const q = (sp.q ?? "").trim().replace(/[,%()]/g, " ").slice(0, 60);
  const pmin = intParam(sp.pmin), pmax = intParam(sp.pmax);
  const imin = intParam(sp.imin), imax = intParam(sp.imax);
  const onlyVerified = sp.verified === "1";
  const onlyVideo = sp.video === "1";
  const attrs = sanitizeAttrs((sp.attrs ?? "").split(",").filter(Boolean));

  // geo — só via query params (assim "limpar filtros" = "/" limpa tudo)
  const cityIdRaw = sp.city_id;
  const cityId = cityIdRaw && Number.isFinite(Number(cityIdRaw)) ? Number(cityIdRaw) : null;
  const nearby = sp.nearby === "1"; // padrão: só a cidade selecionada (vizinhas via toggle)

  // estágio 1: tudo que não depende de outra query, em paralelo
  const userInfoFn = async () => {
    const { data: { user } } = await ssr.auth.getUser();
    const hasAd = user ? await userHasAd(admin, user.id) : false;
    return { user, hasAd };
  };
  const cityInfoFn = async (): Promise<{ cityFilter: number[] | null; cityLabel?: string }> => {
    if (!cityId) return { cityFilter: null };
    const { data: cityRow } = await admin.from("cities").select("name, uf").eq("id", cityId).maybeSingle();
    const cityLabel = cityRow ? `${cityRow.name} - ${cityRow.uf}` : undefined;
    if (nearby) {
      const { data: ids } = await admin.rpc("nearby_city_ids", { p_city_id: cityId, p_km: 100 });
      return { cityFilter: (ids ?? []).map((r: any) => (typeof r === "number" ? r : r.nearby_city_ids ?? r.id)), cityLabel };
    }
    return { cityFilter: [cityId], cityLabel };
  };
  const videoIdsFn = async (): Promise<string[] | null> => {
    if (!onlyVideo) return null;
    const { data } = await admin.from("ad_media").select("ad_id").eq("type", "video");
    return Array.from(new Set((data ?? []).map((r: any) => r.ad_id)));
  };
  // cidades candidatas próximas (geo puro; filtro de "tem anúncio" vem depois do batch)
  const nearbyRawFn = async (): Promise<{ self: { lat: number; lng: number } | null; candidates: { id: number; name: string; uf: string; lat: number; lng: number }[] }> => {
    if (!cityId) return { self: null, candidates: [] };
    const { data: self } = await admin.from("cities").select("lat, lng").eq("id", cityId).maybeSingle();
    if (!self) return { self: null, candidates: [] };
    const { data: idsRaw } = await admin.rpc("nearby_city_ids", { p_city_id: cityId, p_km: 200 });
    const idList = (idsRaw ?? [])
      .map((r: any) => (typeof r === "number" ? r : r.nearby_city_ids ?? r.id))
      .filter((x: number) => x !== cityId)
      .slice(0, 400);
    if (!idList.length) return { self, candidates: [] };
    const { data: rows } = await admin.from("cities").select("id, name, uf, lat, lng").in("id", idList);
    return { self, candidates: (rows ?? []) as any[] };
  };

  const [{ data: activeSubs, error: activeSubsError }, userInfo, cityInfo, videoAdIds, nearbyRaw] = await Promise.all([
    admin.from("subscriptions").select("profile_id, plans ( slug )").eq("status", "active").gt("current_period_end", nowIso),
    userInfoFn(),
    cityInfoFn(),
    videoIdsFn(),
    nearbyRawFn(),
  ]);
  if (activeSubsError) console.error("home subscriptions query:", activeSubsError.message);

  const user = userInfo.user;
  const loggedIn = !!user;
  const hasAd = userInfo.hasAd;
  const cityFilter = cityInfo.cityFilter;
  const cityLabel = cityInfo.cityLabel;

  const planByProfile = new Map<string, string>();
  ((activeSubs ?? []) as { profile_id: string; plans: { slug: string } | { slug: string }[] | null }[]).forEach((s) => {
    const plan = Array.isArray(s.plans) ? s.plans[0] : s.plans;
    if (plan?.slug) planByProfile.set(s.profile_id, plan.slug);
  });
  const activeProfileIds = Array.from(planByProfile.keys());

  // cidades próximas: só as que TÊM anúncio visível (ativo + verificado + assinatura ativa)
  let nearbyCities: { id: number; name: string; uf: string }[] = [];
  if (cityId && nearbyRaw.self && nearbyRaw.candidates.length && activeProfileIds.length) {
    const candIds = nearbyRaw.candidates.map((c) => c.id);
    const { data: adCities } = await admin
      .from("ads").select("city_id")
      .eq("status", "active").eq("verified", true)
      .in("profile_id", activeProfileIds).in("city_id", candIds);
    const withAds = new Set((adCities ?? []).map((a: any) => a.city_id));
    const self = nearbyRaw.self;
    const R = Math.PI / 180;
    const hav = (la: number, lo: number) => {
      const dLat = (la - self.lat) * R, dLng = (lo - self.lng) * R;
      return Math.sin(dLat / 2) ** 2 + Math.cos(self.lat * R) * Math.cos(la * R) * Math.sin(dLng / 2) ** 2;
    };
    nearbyCities = nearbyRaw.candidates
      .filter((c) => withAds.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, uf: c.uf, d: hav(c.lat, c.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map(({ id, name, uf }) => ({ id, name, uf }));
  }

  let data: AdRow[] = [];
  if (activeProfileIds.length > 0) {
    let query = admin
      .from("ads")
      .select(`*, cities ( name, uf ), profiles ( name, whatsapp )`)
      .eq("status", "active")
      .eq("verified", true)
      .in("profile_id", activeProfileIds);
    if (cityFilter) query = query.in("city_id", cityFilter);
    if (q) query = query.ilike("title", `%${q}%`);
    if (pmin != null) query = query.gte("price_cents", pmin * 100);
    if (pmax != null) query = query.lte("price_cents", pmax * 100);
    if (imin != null) query = query.gte("age", imin);
    if (imax != null) query = query.lte("age", imax);
    if (onlyVerified) query = query.eq("verified", true);
    if (attrs.length) query = query.overlaps("attributes", attrs);
    if (onlyVideo) query = query.in("id", videoAdIds!.length ? videoAdIds! : ["00000000-0000-0000-0000-000000000000"]);
    const res = await query
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (res.error) console.error("home ads query:", res.error.message);
    data = (res.data ?? []) as unknown as AdRow[];
  }

  const ids = data.map((r) => r.id);
  const videoCount = new Map<string, number>();
  const story = new Map<string, string>();
  if (ids.length > 0) {
    const [vids, stories] = await Promise.all([
      admin.from("ad_media").select("ad_id").eq("type", "video").in("ad_id", ids),
      admin.from("stories").select("ad_id, created_at").in("ad_id", ids).gt("expires_at", nowIso),
    ]);
    (vids.data ?? []).forEach((r: any) => videoCount.set(r.ad_id, (videoCount.get(r.ad_id) ?? 0) + 1));
    (stories.data ?? []).forEach((r: any) => { if (!story.has(r.ad_id)) story.set(r.ad_id, r.created_at); });
  }

  const profiles: ProfileCardData[] = data.map((r) => {
    const city = (Array.isArray(r.cities) ? r.cities[0] : r.cities) ?? null;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const vc = videoCount.get(r.id) ?? 0;
    const storyAt = story.get(r.id);
    return {
      id: r.id,
      name: profile?.name?.trim() || r.title,
      age: r.age ?? 0,
      city: city ? `${city.name}` : "",
      description: r.headline?.trim() || r.description,
      priceLabel: r.price_cents > 0 ? `R$ ${Math.round(r.price_cents / 100).toLocaleString("pt-BR")}` : null,
      verified: !!r.verified,
      videoCount: vc,
      hasVideo: vc > 0 || !!storyAt,
      recordedAt: storyAt ? hhmm(storyAt) : null,
      featured: planByProfile.get(r.profile_id) === "premium",
      available: !!r.is_available,
      hue: hueFromId(r.id),
    };
  });

  const hasFilters = !!(q || pmin || pmax || imin || imax || onlyVerified || onlyVideo || attrs.length || cityId);

  // links internos p/ SEO (cidades com anúncios visíveis nos resultados)
  const browseCities = Array.from(
    new Map(
      data
        .map((r) => {
          const c = (Array.isArray(r.cities) ? r.cities[0] : r.cities) as CityEmbed | null;
          return c ? ([`${c.name}|${c.uf}`, { name: c.name, uf: c.uf }] as const) : null;
        })
        .filter(Boolean) as [string, { name: string; uf: string }][]
    ).values()
  ).slice(0, 24);

  // chips de filtros aplicados (removíveis) acima dos resultados
  function hrefWithout(changes: Record<string, string | null>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) p.set(k, v);
    for (const [k, v] of Object.entries(changes)) { if (v) p.set(k, v); else p.delete(k); }
    const s = p.toString();
    return s ? `/?${s}` : "/";
  }
  const chips: { label: string; href: string }[] = [];
  if (q) chips.push({ label: `“${q}”`, href: hrefWithout({ q: null }) });
  if (cityId) chips.push({ label: cityLabel ?? "Cidade", href: hrefWithout({ city_id: null, nearby: null }) });
  if (pmin || pmax) chips.push({ label: `R$ ${pmin ?? 0}–${pmax ?? "∞"}`, href: hrefWithout({ pmin: null, pmax: null }) });
  if (imin || imax) chips.push({ label: `${imin ?? 18}–${imax ?? "∞"} anos`, href: hrefWithout({ imin: null, imax: null }) });
  if (onlyVerified) chips.push({ label: "Verificada", href: hrefWithout({ verified: null }) });
  if (onlyVideo) chips.push({ label: "Com vídeo", href: hrefWithout({ video: null }) });
  for (const slug of attrs) chips.push({ label: labelOf(slug), href: hrefWithout({ attrs: attrs.filter((a) => a !== slug).join(",") || null }) });

  return (
    <>
      <VitrineTopBar cityLabel={cityLabel} defaultQuery={q} loggedIn={loggedIn} hasAd={hasAd} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <section className="py-4">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Acompanhantes {cityLabel ? <>em <span className="text-accent">{cityLabel.replace(" - ", "-")}</span></> : <>perto de <span className="text-accent">você</span></>}
          </h1>
          {hasFilters && (
            <p className="mt-0.5 text-sm text-muted">
              {profiles.length} resultado{profiles.length === 1 ? "" : "s"}
              {q && <> · busca “{q}”</>}
              {" · "}<Link href="/" className="text-accent underline">limpar filtros</Link>
            </p>
          )}
        </section>

        {chips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <Link key={c.label} href={c.href} className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-white">
                {c.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </Link>
            ))}
            <Link href="/" className="text-xs font-semibold text-muted hover:text-accent">Limpar tudo</Link>
          </div>
        )}

        {profiles.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {profiles.map((p) => (
              <ProfileCard key={p.id} p={p} hrefBase="/anuncio" />
            ))}
          </div>
        )}
        {cityId && nearbyCities.length > 0 && (
          <nav className="mt-14 border-t border-line/60 pt-8">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.9" /><circle cx="12" cy="11" r="2.4" fill="currentColor" /></svg>
              </span>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                Cidades próximas de <span className="text-accent">{cityLabel?.replace(" - ", "-") ?? "você"}</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {nearbyCities.map((c) => (
                <Link
                  key={c.id}
                  href={hrefWithout({ city_id: String(c.id), nearby: null })}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface px-3.5 py-3 transition-all hover:border-accent/60 hover:bg-gradient-to-r hover:from-accent-soft/50 hover:to-surface"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.9" /><circle cx="12" cy="11" r="2.4" fill="currentColor" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-bold text-ink group-hover:text-accent">{c.name}</span>
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">{c.uf}</span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              ))}
            </div>
          </nav>
        )}

        {browseCities.length > 1 && (
          <nav className="mt-10 border-t border-line/60 pt-5">
            <h2 className="mb-2 font-display text-sm font-bold text-ink">Acompanhantes por cidade</h2>
            <div className="flex flex-wrap gap-2">
              {browseCities.map((c) => (
                <Link key={`${c.name}-${c.uf}`} href={cityPath(c.name, c.uf)} className="rounded-pill border border-line bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
                  {c.name}-{c.uf}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </div>
      <p className="font-display text-lg font-bold text-ink">{hasFilters ? "Nada encontrado com esses filtros" : "Nenhum anúncio por aqui ainda"}</p>
      {hasFilters ? (
        <Link href="/" className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-95">Limpar filtros</Link>
      ) : (
        <>
          <p className="mt-1 max-w-xs text-sm text-muted">Seja a primeira a divulgar seu perfil nesta cidade.</p>
          <Link href="/meu-anuncio" className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-95">Criar meu anúncio</Link>
        </>
      )}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-line/70">
      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
          <span className="font-display font-bold text-ink">vitrine<span className="text-accent">vip</span></span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-semibold text-ink">+18</span>
            <Link href="/termos" className="transition-colors hover:text-accent">Termos de Uso</Link>
            <Link href="/privacidade" className="transition-colors hover:text-accent">Privacidade</Link>
            <Link href="/cookies" className="transition-colors hover:text-accent">Cookies</Link>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-center text-[11px] leading-relaxed text-muted/80">
          A vitrine é uma plataforma de <strong className="text-muted">publicidade</strong>. Os anúncios são de responsabilidade exclusiva de cada anunciante, maior de 18 anos, que divulga por conta própria seus serviços de acompanhante (festas, jantares, viagens etc.). <strong className="text-muted">Não intermediamos garotas de programa</strong> nem participamos de qualquer contato ou negociação entre as partes.
        </p>
      </div>
    </footer>
  );
}
