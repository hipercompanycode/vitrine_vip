import { createAdminClient } from "@/lib/supabase/server";
import { getPayment, isPaid } from "@/lib/asaas";
import { extendPeriodISO } from "@/lib/subscription";

type Admin = ReturnType<typeof createAdminClient>;

// Credita uma cobrança Pix PAGA na assinatura, de forma idempotente.
// A verdade do "pago" é sempre o Asaas (revalida via getPayment), nunca o corpo do webhook.
// Chamado tanto pelo webhook quanto pelo polling de status — o primeiro credita, o resto é no-op.
export async function creditPaidPayment(admin: Admin, paymentId: string): Promise<{ credited: boolean; reason?: string }> {
  const payment = await getPayment(paymentId);
  if (!isPaid(payment.status)) return { credited: false, reason: "não pago" };
  const profileId = payment.externalReference;
  if (!profileId) return { credited: false, reason: "sem externalReference" };

  const { data: sub } = await admin
    .from("subscriptions")
    .select("current_period_end, asaas_paid_payment_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  // idempotência: essa cobrança já foi creditada → não soma de novo.
  if ((sub?.asaas_paid_payment_id as string | null) === paymentId) return { credited: false, reason: "já creditado" };

  // deduz o plano pago pelo valor da cobrança (Pro/Premium). O plano só é
  // aplicado agora (no pagamento), nunca antes.
  const cents = Math.round((payment.value ?? 0) * 100);
  const { data: plan } = await admin.from("plans").select("id").eq("price_cents", cents).gt("price_cents", 0).maybeSingle();
  if (!plan?.id) return { credited: false, reason: `plano não encontrado p/ valor ${cents}` };

  const now = new Date();
  // Renovação (já tinha pagamento creditado) empilha os dias; vindo do Grátis
  // (sem pagamento anterior), começa 30 dias a partir de agora.
  const base = (sub?.asaas_paid_payment_id as string | null) ? (sub?.current_period_end as string | null) : null;
  const current_period_end = extendPeriodISO(base, now, 30);

  const { error } = await admin.from("subscriptions")
    .update({ plan_id: plan.id, method: "pix", status: "active", current_period_end, asaas_paid_payment_id: paymentId })
    .eq("profile_id", profileId);
  if (error) return { credited: false, reason: error.message };
  return { credited: true };
}
