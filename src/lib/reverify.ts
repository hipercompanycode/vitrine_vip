import type { SupabaseClient } from "@supabase/supabase-js";

// Reverificação de vivacidade: a pessoa refaz a selfie (papel+código) de tempos
// em tempos e quando algo suspeito acontece. Serve pra pegar REVENDA/HANDOFF do
// perfil (o golpista que comprou o perfil não passa na selfie da pessoa real).
export const REVERIFY_DAYS = 30;
export const REPORTS_TRIGGER = 3; // nº de denúncias no anúncio que força reverificar

export function reverifyDueISO(fromISO?: string | null): string {
  const base = fromISO ? new Date(fromISO) : new Date();
  return new Date(base.getTime() + REVERIFY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// Força a reverificação de um anunciante APROVADO: pausa o selo/anúncio e coloca
// a verificação no estado "reverify" (a pessoa precisa refazer a selfie).
export async function forceReverify(admin: SupabaseClient, profileId: string, reason: string): Promise<boolean> {
  const { data: v } = await admin.from("verifications").select("status").eq("profile_id", profileId).maybeSingle();
  if (!v || v.status !== "approved") return false; // só reverifica quem estava aprovado
  await admin.from("verifications").update({ status: "reverify", reverify_forced: false, reverify_reason: reason }).eq("profile_id", profileId);
  await admin.from("ads").update({ verified: false }).eq("profile_id", profileId); // some da vitrine até refazer
  return true;
}

// Gatilho por denúncias: se o anúncio acumula muitas denúncias, força reverificar o dono.
export async function maybeReverifyFromReports(admin: SupabaseClient, adId: string): Promise<void> {
  const { data: ad } = await admin.from("ads").select("profile_id").eq("id", adId).maybeSingle();
  if (!ad?.profile_id) return;
  const { count } = await admin.from("reports").select("id", { count: "exact", head: true }).eq("ad_id", adId);
  if ((count ?? 0) >= REPORTS_TRIGGER) {
    await forceReverify(admin, ad.profile_id as string, `${count} denúncias no anúncio`);
  }
}
