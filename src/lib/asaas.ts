// Cliente server-only do Asaas (Pix). A API key nunca vai ao browser.
// Sandbox: ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3  | Produção: https://api.asaas.com/v3
const BASE = process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";

type Init = { method?: string; body?: string };

async function asaas<T = unknown>(path: string, init?: Init): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY ausente");
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json", access_token: key },
    body: init?.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const desc = (data?.errors?.[0]?.description as string) || `Asaas ${res.status}`;
    throw new Error(desc);
  }
  return data as T;
}

// Reusa o cliente por externalReference (= profile_id); senão cria.
export async function ensureCustomer(input: {
  name: string; email?: string; cpfCnpj: string; externalReference: string;
}): Promise<string> {
  const found = await asaas<{ data?: Array<{ id: string }> }>(
    `/customers?externalReference=${encodeURIComponent(input.externalReference)}&limit=1`
  );
  if (found.data?.[0]?.id) return found.data[0].id;
  const created = await asaas<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name, email: input.email, cpfCnpj: input.cpfCnpj,
      externalReference: input.externalReference,
    }),
  });
  return created.id;
}

export type PixQr = { encodedImage: string; payload: string; expirationDate: string };

export async function createPixCharge(input: {
  customer: string; value: number; description: string; externalReference: string; dueDate: string;
}): Promise<{ id: string; status: string; qr: PixQr }> {
  const payment = await asaas<{ id: string; status: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: "PIX",
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
  const qr = await asaas<PixQr>(`/payments/${payment.id}/pixQrCode`);
  return { id: payment.id, status: payment.status, qr };
}

export type AsaasPayment = { id: string; status: string; externalReference?: string; value?: number };

export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaas<AsaasPayment>(`/payments/${id}`);
}

// Pix "confirmado/pago": status RECEIVED (Pix cai na hora) ou CONFIRMED.
export function isPaid(status: string): boolean {
  return status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH";
}
