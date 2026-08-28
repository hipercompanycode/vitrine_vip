import type { SupabaseClient } from "@supabase/supabase-js";
import { publicUrl } from "@/lib/storage";

export const AVAILABLE_TTL_MS = 60 * 60 * 1000; // "disponível agora" vale por 1h

export type Cover = { url: string; blurred: boolean };

/**
 * Foto de capa de cada anúncio (em lote), respeitando a moderação por foto:
 *  - 'pendente' não entra (escondida do público até o admin liberar);
 *  - 'liberada' → nítida pra todos;
 *  - 'nudez' → nítida pro logado; pro anônimo, a cópia BORRADA (blurred=true).
 * Capa = is_cover entre as visíveis; senão a de menor position.
 */
// `adult`: viewer logado E com 18+ confirmado (data de nascimento). Só ele vê a
// foto de nudez nítida; anônimo, menor de 18 ou sem data => recebe a cópia borrada.
export async function coverUrlMap(admin: SupabaseClient, ids: string[], adult: boolean): Promise<Map<string, Cover>> {
  const map = new Map<string, Cover>();
  if (!ids.length) return map;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const { data } = await admin
    .from("ad_media")
    .select("ad_id, storage_path, is_cover, position, review, blur_path")
    .eq("type", "photo")
    .in("ad_id", ids)
    .order("position", { ascending: true });

  const toCover = (r: { storage_path: string; review: string | null; blur_path: string | null }): Cover | null => {
    const review = r.review ?? "liberada";
    // só 'liberada' e 'nudez' (aprovada) aparecem; 'pendente' e 'nudez_rev' ficam escondidas até o admin aprovar
    if (review !== "liberada" && review !== "nudez") return null;
    if (review === "nudez" && !adult) {
      if (!r.blur_path) return { url: "", blurred: true }; // sem cópia borrada → placeholder
      return { url: publicUrl(base, "ad-media", r.blur_path), blurred: true };
    }
    return { url: publicUrl(base, "ad-media", r.storage_path), blurred: false };
  };

  const covered = new Set<string>(); // já achou a capa oficial (is_cover) visível
  for (const r of (data ?? []) as { ad_id: string; storage_path: string; is_cover: boolean | null; position: number; review: string | null; blur_path: string | null }[]) {
    if (covered.has(r.ad_id)) continue;
    const c = toCover(r);
    if (!c) continue; // pendente: pula
    if (r.is_cover) { map.set(r.ad_id, c); covered.add(r.ad_id); }
    else if (!map.has(r.ad_id)) map.set(r.ad_id, c); // fallback: menor position visível
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
