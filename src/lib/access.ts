import { createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";

type Admin = ReturnType<typeof createAdminClient>;

// Estado de acesso do anunciante para o paywall/gating.
// - active: assinatura (paga ou trial) vigente.
// - verifApproved: comprovação aprovada pela moderação.
// Regra: depois de aprovado, precisa estar ativo para "mexer" no anúncio.
export async function accountAccess(admin: Admin, profileId: string) {
  const [{ data: sub }, { data: verif }] = await Promise.all([
    admin.from("subscriptions").select("status, current_period_end").eq("profile_id", profileId).maybeSingle(),
    admin.from("verifications").select("status").eq("profile_id", profileId).maybeSingle(),
  ]);
  const active = isActive(sub as { status: string; current_period_end: string | null } | null, new Date());
  const verifApproved = ((verif?.status as string | undefined) ?? null) === "approved";
  return { active, verifApproved };
}
