import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { SITE_URL, cityPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const out: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/planos`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const { data: subs } = await admin
    .from("subscriptions").select("profile_id").eq("status", "active").gt("current_period_end", nowIso);
  const pids = Array.from(new Set((subs ?? []).map((s: any) => s.profile_id)));
  if (pids.length === 0) return out;

  const { data: ads } = await admin
    .from("ads")
    .select("id, updated_at, city_id, cities ( name, uf )")
    .eq("status", "active")
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
    out.push({ url: `${SITE_URL}${cityPath(c.name, c.uf)}`, changeFrequency: "daily", priority: 0.8 });
  }
  return out;
}
