"use client";
import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-browser";
import { btnPrimary } from "@/components/ui";

type Method = "card" | "pix";

function PaymentInner({ method }: { method: Method }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMsg(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/assinatura/sucesso` },
      redirect: "if_required",
    });
    if (error) {
      setMsg(error.message ?? "Não foi possível concluir o pagamento.");
      setBusy(false);
      return;
    }
    // Cartão: sucesso imediato. Pix: QR foi exibido pelo PaymentElement; a confirmação vem async.
    window.location.href = "/assinatura/sucesso";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <button className={btnPrimary} disabled={busy || !stripe}>
        {busy ? "Processando…" : method === "pix" ? "Gerar Pix" : "Pagar"}
      </button>
    </form>
  );
}

export default function SubscribeForm({ slug }: { slug: string }) {
  const [method, setMethod] = useState<Method>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start(m: Method) {
    setMethod(m);
    setClientSecret(null);
    setErr(null);
    setLoading(true);
    const route = m === "card" ? "/api/subscription/create" : "/api/pix/create";
    const res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.clientSecret) {
      setErr(data.error ?? "Falha ao iniciar pagamento.");
      return;
    }
    setClientSecret(data.clientSecret);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => start("card")}
          className={`flex-1 rounded-input border py-2 text-sm font-semibold transition-colors ${method === "card" ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}
        >
          Cartão (mensal)
        </button>
        <button
          type="button"
          onClick={() => start("pix")}
          className={`flex-1 rounded-input border py-2 text-sm font-semibold transition-colors ${method === "pix" ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}
        >
          Pix (30 dias)
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Iniciando…</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {clientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#ec4899" } } }}>
          <PaymentInner method={method} />
        </Elements>
      )}

      {!clientSecret && !loading && (
        <p className="text-xs text-muted">Escolha um método para continuar.</p>
      )}
    </div>
  );
}
