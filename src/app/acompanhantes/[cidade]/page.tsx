import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { type ProfileCardData } from "@/components/ProfileCard";
import BumpedGrid, { type BumpGroup } from "@/components/BumpedGrid";
import { bumpBucket } from "@/lib/bump";
import { availableActive, coverUrlMap, type Cover } from "@/lib/ads";
import { publicUrl } from "@/lib/storage";
import VitrineTopBar from "@/components/VitrineTopBar";
import SiteFooter from "@/components/SiteFooter";
import { citySlug, parseCitySlug, cityPath, absUrl, SITE_NAME, SITE_URL, ldBreadcrumb, ldItemList, jsonLdScript, isTargetCity } from "@/lib/seo";

// Página de SEO: cacheada (ISR) e regenerada a cada 5 min — resposta rápida p/ buscadores.
export const revalidate = 300;

type City = { id: number; name: string; uf: string };

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

async function findCity(slug: string): Promise<City | null> {
  const parsed = parseCitySlug(slug);
  if (!parsed) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("cities").select("id, name, uf").eq("uf", parsed.uf);
  return ((data ?? []) as City[]).find((c) => citySlug(c.name, c.uf) === slug) ?? null;
}

async function visibleProfilesInCity(cityId: number): Promise<{ profiles: ProfileCardData[]; groups: BumpGroup[] }> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: subs } = await admin
    .from("subscriptions").select("profile_id, plans ( slug )").eq("status", "active").gt("current_period_end", nowIso);
  const planByProfile = new Map<string, string>();
  (subs ?? []).forEach((s: any) => { const p = Array.isArray(s.plans) ? s.plans[0] : s.plans; if (p?.slug) planByProfile.set(s.profile_id, p.slug); });
  const pids = Array.from(planByProfile.keys());
  if (!pids.length) return { profiles: [], groups: [] };

  const { data } = await admin
    .from("ads")
    .select("*, cities ( name, uf ), profiles ( name )")
    .eq("status", "active").eq("verified", true).eq("city_id", cityId).in("profile_id", pids)
    .order("bumped_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as any[];
  const ids = rows.map((r) => r.id);

  const videoCount = new Map<string, number>();
  const story = new Map<string, string>();
  let cover = new Map<string, Cover>();
  if (ids.length) {
    const [v, st, covers] = await Promise.all([
      admin.from("ad_media").select("ad_id").eq("type", "video").in("ad_id", ids),
      admin.from("stories").select("ad_id, created_at").in("ad_id", ids).gt("expires_at", nowIso),
      coverUrlMap(admin, ids, false), // página cacheada (ISR) → trata como anônimo
    ]);
    (v.data ?? []).forEach((r: any) => videoCount.set(r.ad_id, (videoCount.get(r.ad_id) ?? 0) + 1));
    (st.data ?? []).forEach((r: any) => { if (!story.has(r.ad_id)) story.set(r.ad_id, r.created_at); });
    cover = covers;
  }

  const nowDate = new Date();
  const nowMs = nowDate.getTime();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const groupMap = new Map<string, BumpGroup & { order: number }>();
  const profiles: ProfileCardData[] = [];
  for (const r of rows) {
    const city = Array.isArray(r.cities) ? r.cities[0] : r.cities;
    const vc = videoCount.get(r.id) ?? 0;
    const sa = story.get(r.id);
    const card: ProfileCardData = {
      id: r.id, name: r.title?.trim() || "Acompanhante", age: r.age ?? 0, city: city ? city.name : "",
      description: r.headline?.trim() || r.description,
      priceLabel: r.price_cents > 0 ? `R$ ${Math.round(r.price_cents / 100).toLocaleString("pt-BR")}` : null,
      verified: !!r.verified, videoCount: vc, hasVideo: vc > 0 || !!sa,
      recordedAt: sa ? hhmm(sa) : null, featured: planByProfile.get(r.profile_id) === "premium",
      available: availableActive(r.is_available, r.available_since, nowMs), hue: hueFromId(r.id),
      cover: cover.get(r.id)?.url ?? null, coverBlurred: cover.get(r.id)?.blurred ?? false,
      audioUrl: r.audio_path ? publicUrl(base, "ad-media", r.audio_path) : null,
    };
    profiles.push(card);
    const t = new Date(r.bumped_at || r.created_at).getTime();
    const b = card.available
      ? { key: "disp", label: "Disponível agora", order: -1000 }
      : bumpBucket(Math.max(0, (nowMs - t) / 60000), nowDate);
    let g = groupMap.get(b.key);
    if (!g) { g = { key: b.key, label: b.label, order: b.order, items: [] }; groupMap.set(b.key, g); }
    g.items.push(card);
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => a.order - b.order);
  return { profiles, groups };
}

export async function generateMetadata({ params }: { params: Promise<{ cidade: string }> }): Promise<Metadata> {
  const { cidade } = await params;
  const city = await findCity(cidade);
  if (!city) return { title: "Cidade não encontrada", robots: { index: false, follow: false } };
  const n = (await visibleProfilesInCity(city.id)).profiles.length;
  const title = `Acompanhantes em ${city.name}-${city.uf}`;
  const description = n > 0
    ? `${n} acompanhante${n > 1 ? "s" : ""} verificada${n > 1 ? "s" : ""} em ${city.name}-${city.uf}. Fotos e vídeos reais, perfis atualizados e contato direto por WhatsApp.`
    : `Acompanhantes em ${city.name}-${city.uf}. Veja perfis e cidades próximas.`;
  const url = cityPath(city.name, city.uf);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: absUrl(url), type: "website" },
    // indexa se tem perfil OU é cidade-alvo (capital/metrópole) — seed de ranqueamento
    robots: n > 0 || isTargetCity(city.name, city.uf) ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function CityPage({ params }: { params: Promise<{ cidade: string }> }) {
  const { cidade } = await params;
  const city = await findCity(cidade);
  if (!city) notFound();

  const { profiles, groups } = await visibleProfilesInCity(city.id);

  // cidades próximas COM anúncio -> links internos
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: nearIds } = await admin.rpc("nearby_city_ids", { p_city_id: city.id, p_km: 100 });
  const nearbyIds = ((nearIds ?? []) as any[]).map((r) => (typeof r === "number" ? r : r.nearby_city_ids ?? r.id)).filter((id: number) => id !== city.id);
  let nearbyLinks: City[] = [];
  if (nearbyIds.length) {
    const { data: subs } = await admin.from("subscriptions").select("profile_id").eq("status", "active").gt("current_period_end", nowIso);
    const pids = Array.from(new Set((subs ?? []).map((s: any) => s.profile_id)));
    if (pids.length) {
      const { data: adCities } = await admin.from("ads").select("city_id").eq("status", "active").eq("verified", true).in("profile_id", pids).in("city_id", nearbyIds);
      const withAds = Array.from(new Set((adCities ?? []).map((a: any) => a.city_id)));
      if (withAds.length) {
        const { data: cs } = await admin.from("cities").select("id, name, uf").in("id", withAds.slice(0, 12));
        nearbyLinks = (cs ?? []) as City[];
      }
    }
  }

  const itemUrls = profiles.map((p) => absUrl(`/anuncio/${p.id}`));
  const ld = [
    ldBreadcrumb([{ name: "Início", url: SITE_URL }, { name: "Cidades", url: absUrl("/acompanhantes") }, { name: `Acompanhantes em ${city.name}-${city.uf}`, url: absUrl(cityPath(city.name, city.uf)) }]),
    ...(itemUrls.length ? [ldItemList(itemUrls)] : []),
  ];

  return (
    <>
      <VitrineTopBar cityLabel={`${city.name} - ${city.uf}`} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <nav className="pt-3 text-xs text-muted">
          <Link href="/" className="hover:text-accent">Início</Link> › <Link href="/acompanhantes" className="hover:text-accent">Cidades</Link> › <span className="text-ink">{city.name}-{city.uf}</span>
        </nav>
        <section className="py-4">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Acompanhantes em <span className="text-accent">{city.name}-{city.uf}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {profiles.length > 0
              ? `${profiles.length} perfil${profiles.length > 1 ? "is" : ""} verificado${profiles.length > 1 ? "s" : ""} em ${city.name}. Fotos e vídeos reais, contato direto por WhatsApp — atualizados diariamente.`
              : `Ainda não há perfis em ${city.name}. Veja as cidades próximas abaixo.`}
          </p>
        </section>

        {profiles.length > 0 && <BumpedGrid groups={groups} />}

        {nearbyLinks.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 font-display text-base font-bold text-ink">Acompanhantes em cidades próximas</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyLinks.map((c) => (
                <Link key={c.id} href={cityPath(c.name, c.uf)} className="rounded-pill border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent">
                  {c.name}-{c.uf}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* texto SEO — conteúdo único por cidade */}
        <section className="mt-10 border-t border-line/60 pt-6">
          <h2 className="mb-2 font-display text-base font-bold text-ink">Acompanhantes verificadas em {city.name}-{city.uf}</h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              Encontre <strong className="text-ink">acompanhantes em {city.name}</strong> ({city.uf}) com perfil verificado na {SITE_NAME}. Todos os anúncios passam por validação anti-fake — documento e fotos conferidos pela moderação — para garantir que a pessoa é real. Você fala direto por WhatsApp, Telegram ou ligação, sem intermediários.
            </p>
            <p>
              Filtre por preço, idade e características, veja quem está <strong className="text-ink">disponível agora</strong> em {city.name} e confira os perfis atualizados ao longo do dia. {nearbyLinks.length > 0 ? `Não achou o que procura? Veja também acompanhantes nas cidades próximas.` : `Cadastre seu anúncio e apareça em ${city.name}.`}
            </p>
            <p className="text-xs text-muted/80">
              A {SITE_NAME} é uma plataforma de publicidade para maiores de 18 anos. Os anúncios são de responsabilidade de cada anunciante; não intermediamos serviços entre as partes.
            </p>
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      </main>
      <SiteFooter />
    </>
  );
}
