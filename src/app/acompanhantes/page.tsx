import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import VitrineTopBar from "@/components/VitrineTopBar";
import SiteFooter from "@/components/SiteFooter";
import {
  TARGET_CITIES, isTargetCity, cityPath, citySlug, absUrl, SITE_URL, SITE_NAME,
  ldBreadcrumb, ldItemList, jsonLdScript, REGIONS, regionPath,
} from "@/lib/seo";

export const revalidate = 300;

type City = { id: number; name: string; uf: string };

export function generateMetadata(): Metadata {
  const title = `Acompanhantes por cidade no Brasil`;
  const description = `Encontre acompanhantes verificadas por cidade na ${SITE_NAME}. Capitais e principais regiões do Brasil — perfis reais, fotos verificadas e contato direto.`;
  return {
    title,
    description,
    alternates: { canonical: "/acompanhantes" },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: absUrl("/acompanhantes"), type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function AcompanhantesHubPage() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1) cidades-alvo que existem no banco (garante link válido)
  const names = TARGET_CITIES.map((c) => c.name);
  const { data: cityRows } = await admin.from("cities").select("id, name, uf").in("name", names);
  const present = ((cityRows ?? []) as City[]).filter((c) => isTargetCity(c.name, c.uf));
  const byKey = new Map(present.map((c) => [`${citySlug(c.name, c.uf)}`, c] as const));
  // mantém a ordem da lista-alvo
  const targetOrdered: City[] = [];
  for (const t of TARGET_CITIES) {
    const c = byKey.get(citySlug(t.name, t.uf));
    if (c) targetOrdered.push(c);
  }

  // 2) cidades com anúncio ativo agora (contagem) — destaque
  const { data: subs } = await admin.from("subscriptions").select("profile_id").eq("status", "active").gt("current_period_end", nowIso);
  const pids = Array.from(new Set((subs ?? []).map((s: any) => s.profile_id)));
  const countByCity = new Map<number, number>();
  if (pids.length) {
    const { data: ads } = await admin.from("ads").select("city_id").eq("status", "active").eq("verified", true).in("profile_id", pids);
    (ads ?? []).forEach((a: any) => { if (a.city_id) countByCity.set(a.city_id, (countByCity.get(a.city_id) ?? 0) + 1); });
  }
  let liveCities: (City & { n: number })[] = [];
  if (countByCity.size) {
    const { data: cs } = await admin.from("cities").select("id, name, uf").in("id", Array.from(countByCity.keys()));
    liveCities = ((cs ?? []) as City[])
      .map((c) => ({ ...c, n: countByCity.get(c.id) ?? 0 }))
      .sort((a, b) => b.n - a.n);
  }

  const ld = [
    ldBreadcrumb([{ name: "Início", url: SITE_URL }, { name: "Cidades", url: absUrl("/acompanhantes") }]),
    ldItemList(targetOrdered.map((c) => absUrl(cityPath(c.name, c.uf)))),
  ];

  return (
    <>
      <VitrineTopBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <nav className="pt-3 text-xs text-muted">
          <Link href="/" className="hover:text-accent">Início</Link> › <span className="text-ink">Cidades</span>
        </nav>

        <section className="py-4">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Acompanhantes <span className="text-accent">por cidade</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Escolha sua cidade e veja acompanhantes com <strong className="text-ink">perfil e fotos verificados</strong> na {SITE_NAME}. Contato direto por WhatsApp, sem intermediários.
          </p>
        </section>

        {REGIONS.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 font-display text-base font-bold text-ink">Por região</h2>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <Link key={r.slug} href={regionPath(r.slug)} className="inline-flex items-center gap-1.5 rounded-pill border border-accent/40 bg-accent-soft/40 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" /></svg>
                  {r.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {liveCities.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 font-display text-base font-bold text-ink">Cidades com perfis agora</h2>
            <div className="flex flex-wrap gap-2">
              {liveCities.map((c) => (
                <Link key={c.id} href={cityPath(c.name, c.uf)} className="inline-flex items-center gap-1.5 rounded-pill border border-accent/40 bg-accent-soft/40 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
                  {c.name}-{c.uf}
                  <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{c.n}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-display text-base font-bold text-ink">Capitais e principais cidades</h2>
          <div className="flex flex-wrap gap-2">
            {targetOrdered.map((c) => (
              <Link key={c.id} href={cityPath(c.name, c.uf)} className="rounded-pill border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent">
                {c.name}-{c.uf}
              </Link>
            ))}
          </div>
        </section>

        {/* texto SEO */}
        <section className="mt-10 border-t border-line/60 pt-6">
          <div className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              A {SITE_NAME} reúne <strong className="text-ink">acompanhantes verificadas em todo o Brasil</strong>, organizadas por cidade. Cada anúncio passa por validação anti-fake — documento e fotos conferidos pela moderação — para garantir perfis reais. Navegue pela sua cidade ou pelas capitais acima e fale direto com quem você escolher.
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
