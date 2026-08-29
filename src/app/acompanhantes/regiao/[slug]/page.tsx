import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import VitrineTopBar from "@/components/VitrineTopBar";
import SiteFooter from "@/components/SiteFooter";
import { availableActive, coverUrlMap, type Cover } from "@/lib/ads";
import { publicUrl } from "@/lib/storage";
import {
  regionBySlug, regionPath, cityPath, citySlug, absUrl, SITE_URL, SITE_NAME,
  ldBreadcrumb, ldItemList, jsonLdScript,
} from "@/lib/seo";

export const revalidate = 300;

type City = { id: number; name: string; uf: string };
function hueFromId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }

async function resolveCities(region: NonNullable<ReturnType<typeof regionBySlug>>): Promise<City[]> {
  const admin = createAdminClient();
  const names = region.cities.map((c) => c.name);
  const { data } = await admin.from("cities").select("id, name, uf").in("name", names);
  const want = new Set(region.cities.map((c) => `${citySlug(c.name, c.uf)}`));
  const found = ((data ?? []) as City[]).filter((c) => want.has(citySlug(c.name, c.uf)));
  // mantém a ordem da região
  const order = new Map(region.cities.map((c, i) => [citySlug(c.name, c.uf), i] as const));
  return found.sort((a, b) => (order.get(citySlug(a.name, a.uf)) ?? 99) - (order.get(citySlug(b.name, b.uf)) ?? 99));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) return { title: "Região não encontrada", robots: { index: false, follow: false } };
  const title = `Acompanhantes na ${region.name}`;
  const description = `Acompanhantes verificadas em ${region.short}: ${region.cities.map((c) => c.name).slice(0, 6).join(", ")} e mais. Fotos e vídeos reais, contato direto por WhatsApp na ${SITE_NAME}.`;
  return {
    title, description,
    alternates: { canonical: regionPath(slug) },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: absUrl(regionPath(slug)), type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function RegiaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) notFound();

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const cities = await resolveCities(region);
  const cityIds = cities.map((c) => c.id);
  const cityById = new Map(cities.map((c) => [c.id, c] as const));

  // anunciantes ativos nessas cidades
  const { data: subs } = await admin.from("subscriptions").select("profile_id, plans ( slug )").eq("status", "active").gt("current_period_end", nowIso);
  const planByProfile = new Map<string, string>();
  (subs ?? []).forEach((s: any) => { const p = Array.isArray(s.plans) ? s.plans[0] : s.plans; if (p?.slug) planByProfile.set(s.profile_id, p.slug); });
  const pids = Array.from(planByProfile.keys());

  let profiles: ProfileCardData[] = [];
  const countByCity = new Map<number, number>();
  if (pids.length && cityIds.length) {
    const { data: rows } = await admin
      .from("ads")
      .select("*, cities ( name, uf ), profiles ( name )")
      .eq("status", "active").eq("verified", true).in("city_id", cityIds).in("profile_id", pids)
      .order("bumped_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(60);
    const ads = (rows ?? []) as any[];
    ads.forEach((r) => { if (r.city_id) countByCity.set(r.city_id, (countByCity.get(r.city_id) ?? 0) + 1); });

    const ids = ads.map((r) => r.id);
    const videoCount = new Map<string, number>();
    const story = new Map<string, { at: string; url: string }>();
    let cover = new Map<string, Cover>();
    if (ids.length) {
      const [v, st, covers] = await Promise.all([
        admin.from("ad_media").select("ad_id").eq("type", "video").in("ad_id", ids),
        admin.from("stories").select("ad_id, created_at, storage_path").in("ad_id", ids).gt("expires_at", nowIso),
        coverUrlMap(admin, ids, false),
      ]);
      (v.data ?? []).forEach((r: any) => videoCount.set(r.ad_id, (videoCount.get(r.ad_id) ?? 0) + 1));
      (st.data ?? []).forEach((r: any) => { if (!story.has(r.ad_id)) story.set(r.ad_id, { at: r.created_at, url: publicUrl(base, "ad-media", r.storage_path) }); });
      cover = covers;
    }
    const nowMs = Date.now();
    profiles = ads.map((r) => {
      const c = Array.isArray(r.cities) ? r.cities[0] : r.cities;
      const vc = videoCount.get(r.id) ?? 0;
      const sa = story.get(r.id);
      return {
        id: r.id, name: r.title?.trim() || "Acompanhante", age: r.age ?? 0, city: c?.name ?? "",
        description: r.headline?.trim() || r.description,
        priceLabel: r.price_cents > 0 ? `R$ ${Math.round(r.price_cents / 100).toLocaleString("pt-BR")}` : null,
        verified: !!r.verified, videoCount: vc, hasVideo: vc > 0 || !!sa,
        storyUrl: sa?.url ?? null, recordedAt: null,
        featured: planByProfile.get(r.profile_id) === "premium",
        available: availableActive(r.is_available, r.available_since, nowMs), hue: hueFromId(r.id),
        cover: cover.get(r.id)?.url ?? null, coverBlurred: cover.get(r.id)?.blurred ?? false,
        audioUrl: r.audio_path ? publicUrl(base, "ad-media", r.audio_path) : null,
      } as ProfileCardData;
    });
  }

  const ld = [
    ldBreadcrumb([{ name: "Início", url: SITE_URL }, { name: "Cidades", url: absUrl("/acompanhantes") }, { name: region.name, url: absUrl(regionPath(slug)) }]),
    ldItemList(cities.map((c) => absUrl(cityPath(c.name, c.uf)))),
  ];

  return (
    <>
      <VitrineTopBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <nav className="pt-3 text-xs text-muted">
          <Link href="/" className="hover:text-accent">Início</Link> › <Link href="/acompanhantes" className="hover:text-accent">Cidades</Link> › <span className="text-ink">{region.name}</span>
        </nav>

        <section className="py-4">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Acompanhantes na <span className="text-accent">{region.name}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Perfis <strong className="text-ink">verificados</strong> em {region.short} — {region.cities.map((c) => c.name).slice(0, 5).join(", ")} e mais. Contato direto por WhatsApp, sem intermediários.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 font-display text-base font-bold text-ink">Cidades da região</h2>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => {
              const n = countByCity.get(c.id) ?? 0;
              return (
                <Link key={c.id} href={cityPath(c.name, c.uf)} className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors ${n > 0 ? "border-accent/40 bg-accent-soft/40 font-semibold text-ink hover:border-accent hover:text-accent" : "border-line bg-surface text-muted hover:text-ink"}`}>
                  {c.name}
                  {n > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{n}</span>}
                </Link>
              );
            })}
          </div>
        </section>

        {profiles.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-base font-bold text-ink">Perfis na região</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {profiles.map((p) => <ProfileCard key={p.id} p={p} hrefBase="/anuncio" />)}
            </div>
          </section>
        )}

        <section className="mt-10 border-t border-line/60 pt-6">
          <h2 className="mb-2 font-display text-base font-bold text-ink">Acompanhantes verificadas em {region.short}</h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              Encontre <strong className="text-ink">acompanhantes na {region.name}</strong> com perfil verificado na {SITE_NAME}. Reunimos as cidades de {region.cities.map((c) => c.name).join(", ")} em um só lugar — cada anúncio passa por validação anti-fake (documento e fotos conferidos pela moderação) pra garantir que a pessoa é real. Você fala direto por WhatsApp, Telegram ou ligação.
            </p>
            <p className="text-xs text-muted/80">
              A {SITE_NAME} é uma plataforma de publicidade para maiores de 18 anos. Os anúncios são de responsabilidade de cada anunciante; não intermediamos serviços entre as partes.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
