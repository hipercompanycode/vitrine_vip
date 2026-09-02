import { createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import { FREE_PLAN, planFromSlug, type Plan } from "@/lib/plans";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Plano efetivo do anunciante (fonte da verdade de gating). Assinatura paga
 * vigente → plano dela; caso contrário → Grátis (o padrão vitalício).
 */
export async function planForProfile(admin: Admin, profileId: string): Promise<Plan> {
  const { data: sub } = await admin
    .from("subscriptions").select("status, current_period_end, plans ( slug )")
    .eq("profile_id", profileId).maybeSingle();
  const active = isActive(sub as { status: string; current_period_end: string | null } | null, new Date());
  if (!active) return FREE_PLAN;
  const rel = Array.isArray((sub as any)?.plans) ? (sub as any).plans[0] : (sub as any)?.plans;
  return planFromSlug(rel?.slug ?? null);
}

const FAR_FUTURE_ISO = () => new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Se o plano PAGO do anunciante venceu, rebaixa pro Grátis vitalício (freemium):
 * o anúncio continua visível na vitrine, só perde os recursos pagos. Cortesia e
 * Grátis não são tocados. Retorna true se rebaixou. Idempotente.
 */
export async function ensureFreeBaseline(admin: Admin, profileId: string): Promise<boolean> {
  const { data: sub } = await admin
    .from("subscriptions").select("method, current_period_end").eq("profile_id", profileId).maybeSingle();
  if (!sub) return false;
  const method = String((sub as any).method ?? "");
  if (method === "free" || method === "cortesia") return false;
  const end = (sub as any).current_period_end ? new Date((sub as any).current_period_end).getTime() : 0;
  if (end > Date.now()) return false; // ainda vigente
  const { data: free } = await admin.from("plans").select("id").eq("slug", "free").maybeSingle();
  if (!free?.id) return false;
  await admin.from("subscriptions").update({
    plan_id: free.id, method: "free", status: "active",
    current_period_end: FAR_FUTURE_ISO(), asaas_paid_payment_id: null,
  }).eq("profile_id", profileId);
  return true;
}

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
