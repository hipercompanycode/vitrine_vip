import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sanitizeAttrs } from "@/lib/attributes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intp(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: subs } = await admin
    .from("subscriptions").select("profile_id").eq("status", "active").gt("current_period_end", nowIso);
  const pids = Array.from(new Set((subs ?? []).map((s: any) => s.profile_id)));
  if (!pids.length) return NextResponse.json({ count: 0 });

  // geo
  const cityId = intp(p.get("city_id"));
  const nearby = (p.get("nearby") ?? "1") !== "0";
  let cityFilter: number[] | null = null;
  if (cityId) {
    if (nearby) {
      const { data: ids } = await admin.rpc("nearby_city_ids", { p_city_id: cityId, p_km: 100 });
      cityFilter = ((ids ?? []) as any[]).map((r) => (typeof r === "number" ? r : r.nearby_city_ids ?? r.id));
    } else {
      cityFilter = [cityId];
    }
  }

  const q = (p.get("q") ?? "").trim().replace(/[,%()]/g, " ").slice(0, 60);
  const pmin = intp(p.get("pmin")), pmax = intp(p.get("pmax"));
  const imin = intp(p.get("imin")), imax = intp(p.get("imax"));
  const onlyVerified = p.get("verified") === "1";
  const onlyVideo = p.get("video") === "1";
  const attrs = sanitizeAttrs((p.get("attrs") ?? "").split(",").filter(Boolean));

  let videoAdIds: string[] | null = null;
  if (onlyVideo) {
    const { data } = await admin.from("ad_media").select("ad_id").eq("type", "video");
    videoAdIds = Array.from(new Set((data ?? []).map((r: any) => r.ad_id)));
  }

  let query = admin.from("ads").select("id", { count: "exact", head: true }).eq("status", "active").in("profile_id", pids);
  if (cityFilter) query = query.in("city_id", cityFilter);
  if (q) query = query.ilike("title", `%${q}%`);
  if (pmin != null) query = query.gte("price_cents", pmin * 100);
  if (pmax != null) query = query.lte("price_cents", pmax * 100);
  if (imin != null) query = query.gte("age", imin);
  if (imax != null) query = query.lte("age", imax);
  if (onlyVerified) query = query.eq("verified", true);
  if (attrs.length) query = query.overlaps("attributes", attrs);
  if (onlyVideo) query = query.in("id", videoAdIds!.length ? videoAdIds! : ["00000000-0000-0000-0000-000000000000"]);

  const { count, error } = await query;
  if (error) return NextResponse.json({ count: 0, error: error.message });
  return NextResponse.json({ count: count ?? 0 });
}
