import type { SupabaseClient } from "@supabase/supabase-js";

export const AVAILABLE_TTL_MS = 60 * 60 * 1000; // "disponível agora" vale por 1h

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
