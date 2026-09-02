import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { ensureCustomer, createPixCharge } from "@/lib/asaas";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { geoFromRequest, recordGeoAndFlag } from "@/lib/geo-ip";

export const runtime = "nodejs";

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const rl = rateLimit(clientKey(request, user.id) + ":pix", 10, 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });

  const { slug, cpf } = await request.json().catch(() => ({ slug: "", cpf: "" }));
  const cpfDigits = onlyDigits(cpf);
  if (cpfDigits.length !== 11) return NextResponse.json({ error: "Informe um CPF válido (11 dígitos)." }, { status: 400 });

  const admin = createAdminClient();
  const { data: plan } = await admin.from("plans").select("id, name, price_cents").eq("slug", slug).maybeSingle();
  if (!plan || (plan.price_cents as number) <= 0) return NextResponse.json({ error: "plano inválido" }, { status: 400 });

  const { data: prof } = await admin.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const name = (prof?.name as string | null)?.trim() || user.email?.split("@")[0] || "Anunciante";

  // sinal de geo por IP no pagamento (anti-handoff; não bloqueia)
  try { await recordGeoAndFlag(admin, user.id, geoFromRequest(request)); } catch (e) { console.error("geo pix:", e); }

  try {
    const customer = await ensureCustomer({
      name, email: user.email ?? undefined, cpfCnpj: cpfDigits, externalReference: user.id,
    });

    const dueDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const value = Math.round(plan.price_cents as number) / 100;
    const charge = await createPixCharge({
      customer,
      value,
      description: `Plano ${plan.name} — Vitrine VIP (30 dias)`,
      externalReference: user.id,
      dueDate,
    });

    // registra a cobrança pendente — NÃO ativa ainda (só o pagamento confirma).
    // upsert parcial: preserva status/current_period_end de um período ativo em andamento.
    await admin.from("subscriptions").upsert(
      { profile_id: user.id, plan_id: plan.id, method: "pix", asaas_customer_id: customer, asaas_payment_id: charge.id },
      { onConflict: "profile_id" }
    );

    return NextResponse.json({
      paymentId: charge.id,
      value,
      qr: {
        encodedImage: charge.qr.encodedImage,
        payload: charge.qr.payload,
        expirationDate: charge.qr.expirationDate,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Falha ao gerar o Pix." }, { status: 502 });
  }
}
