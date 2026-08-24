import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getPayment, isPaid } from "@/lib/asaas";
import { creditPaidPayment } from "@/lib/subscription-credit";

export const runtime = "nodejs";

// Polling da tela: consulta o status da cobrança Pix e, se paga, ativa a assinatura
// (idempotente — funciona como fallback caso o webhook do Asaas atrase ou não chegue).
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { paymentId } = await request.json().catch(() => ({ paymentId: "" }));
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("asaas_payment_id").eq("profile_id", user.id).maybeSingle();
  const id = String(paymentId || sub?.asaas_payment_id || "");
  // só deixa consultar a própria cobrança
  if (!id || (sub?.asaas_payment_id && sub.asaas_payment_id !== id)) {
    return NextResponse.json({ error: "cobrança inválida" }, { status: 400 });
  }

  try {
    const payment = await getPayment(id);
    const paid = isPaid(payment.status);
    if (paid) await creditPaidPayment(admin, id);
    return NextResponse.json({ status: payment.status, paid });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Falha ao consultar." }, { status: 502 });
  }
}
