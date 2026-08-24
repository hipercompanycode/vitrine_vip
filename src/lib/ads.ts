import type { SupabaseClient } from "@supabase/supabase-js";
import { publicUrl } from "@/lib/storage";

export const AVAILABLE_TTL_MS = 60 * 60 * 1000; // "disponível agora" vale por 1h

/**
 * URL pública da foto de capa de cada anúncio (em lote).
 * Capa = is_cover; se nenhuma marcada, a de menor position. Só fotos.
 */
export async function coverUrlMap(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const { data } = await admin
    .from("ad_media")
    .select("ad_id, storage_path, is_cover, position")
    .eq("type", "photo")
    .in("ad_id", ids)
    .order("position", { ascending: true });
  const covered = new Set<string>(); // já tem capa oficial (is_cover)
  for (const r of (data ?? []) as { ad_id: string; storage_path: string; is_cover: boolean | null; position: number }[]) {
    if (covered.has(r.ad_id)) continue;
    if (r.is_cover) {
      map.set(r.ad_id, publicUrl(base, "ad-media", r.storage_path));
      covered.add(r.ad_id);
    } else if (!map.has(r.ad_id)) {
      map.set(r.ad_id, publicUrl(base, "ad-media", r.storage_path)); // fallback: menor position
    }
  }
  return map;
}

/** "Disponível agora" só conta se foi ligado há menos de 1h (expira sozinho). */
export function availableActive(isAvailable: boolean | null, availableSince: string | null, nowMs: number): boolean {
  if (!isAvailable || !availableSince) return false;
  return nowMs - new Date(availableSince).getTime() < AVAILABLE_TTL_MS;
}

/** True se o perfil já tem ao menos um anúncio (mesmo incompleto). */
export async function userHasAd(admin: SupabaseClient, profileId: string): Promise<boolean> {
  const { count } = await admin
    .from("ads")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  return (count ?? 0) > 0;
}
