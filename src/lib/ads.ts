import type { SupabaseClient } from "@supabase/supabase-js";

/** True se o perfil já tem ao menos um anúncio (mesmo incompleto). */
export async function userHasAd(admin: SupabaseClient, profileId: string): Promise<boolean> {
  const { count } = await admin
    .from("ads")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  return (count ?? 0) > 0;
}
