import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { creditPaidPayment } from "@/lib/subscription-credit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook do Asaas. Configure no painel apontando para /api/asaas/webhook
// e defina um token de autenticação (header "asaas-access-token") = ASAAS_WEBHOOK_TOKEN.
export async function POST(request: Request) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (token && request.headers.get("asaas-access-token") !== token) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { event?: string; payment?: { id?: string } }
    | null;
  const event = body?.event;
  const paymentId = body?.payment?.id;
  if (!paymentId) return NextResponse.json({ received: true });

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    try {
      const admin = createAdminClient();
      await creditPaidPayment(admin, paymentId); // revalida no Asaas + credita idempotente
    } catch (e) {
      console.error("asaas webhook:", (e as Error).message);
      return NextResponse.json({ error: "erro interno" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
