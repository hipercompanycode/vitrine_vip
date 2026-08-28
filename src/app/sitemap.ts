import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { SITE_URL, cityPath, citySlug, isTargetCity, TARGET_CITIES } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const out: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/acompanhantes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/planos`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const cityUrls = new Set<string>(); // dedup cidades

  // cidades-alvo (capitais/metrópoles) que existem no banco — indexáveis mesmo sem anúncio
  const { data: targetRows } = await admin.from("cities").select("name, uf").in("name", TARGET_CITIES.map((c) => c.name));
  for (const c of ((targetRows ?? []) as { name: string; uf: string }[])) {
    if (!isTargetCity(c.name, c.uf)) continue;
    const key = citySlug(c.name, c.uf);
    if (cityUrls.has(key)) continue;
    cityUrls.add(key);
    out.push({ url: `${SITE_URL}${cityPath(c.name, c.uf)}`, changeFrequency: "daily", priority: 0.7 });
  }

  const { data: subs } = await admin
    .from("subscriptions").select("profile_id").eq("status", "active").gt("current_period_end", nowIso);
  const pids = Array.from(new Set((subs ?? []).map((s: any) => s.profile_id)));
  if (pids.length === 0) return out;

  const { data: ads } = await admin
    .from("ads")
    .select("id, updated_at, city_id, cities ( name, uf )")
    .eq("status", "active")
    .eq("verified", true)
    .in("profile_id", pids);

  const cityMap = new Map<number, { name: string; uf: string }>();
  for (const a of (ads ?? []) as any[]) {
    out.push({
      url: `${SITE_URL}/anuncio/${a.id}`,
      lastModified: a.updated_at ?? undefined,
      changeFrequency: "daily",
      priority: 0.7,
    });
    const c = Array.isArray(a.cities) ? a.cities[0] : a.cities;
    if (c && a.city_id) cityMap.set(a.city_id, { name: c.name, uf: c.uf });
  }
  for (const c of cityMap.values()) {
    const key = citySlug(c.name, c.uf);
    if (cityUrls.has(key)) continue; // já entrou como cidade-alvo
    cityUrls.add(key);
    out.push({ url: `${SITE_URL}${cityPath(c.name, c.uf)}`, changeFrequency: "daily", priority: 0.8 });
  }
  return out;
}
