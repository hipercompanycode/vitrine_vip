"use client";
import { useEffect, useRef, useState } from "react";
import { btnPrimary, inputCls, labelCls } from "@/components/ui";

type PlanLite = { slug: string; name: string; priceCents: number };
type Qr = { encodedImage: string; payload: string; expirationDate: string };
type Phase = "idle" | "loading" | "pix" | "paid" | "error";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function PixCheckout({
  plans,
  fixedSlug,
  redirectTo = "/meu-anuncio",
}: {
  plans: PlanLite[];
  fixedSlug?: string;
  redirectTo?: string;
}) {
  const [slug, setSlug] = useState(fixedSlug ?? plans[0]?.slug ?? "pro");
  const [cpf, setCpf] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [qr, setQr] = useState<Qr | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const plan = plans.find((p) => p.slug === slug) ?? plans[0];

  async function checkStatus(id: string) {
    try {
      const res = await fetch("/api/asaas/pix/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id }),
      });
      const data = await res.json();
      if (data.paid) {
        setPhase("paid");
        if (timer.current) clearInterval(timer.current);
        window.location.href = redirectTo;
      }
    } catch {
      /* ignora falha pontual de rede no polling */
    }
  }

  useEffect(() => {
    if (phase !== "pix" || !paymentId) return;
    timer.current = setInterval(() => checkStatus(paymentId), 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paymentId]);

  async function generate() {
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErr("Informe um CPF válido.");
      return;
    }
    setErr(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/asaas/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, cpf }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Falha ao gerar o Pix.");
        setPhase("error");
        return;
      }
      setQr(data.qr);
      setPaymentId(data.paymentId);
      setPhase("pix");
    } catch {
      setErr("Falha de conexão. Tente novamente.");
      setPhase("error");
    }
  }

  async function copy() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  if (phase === "pix" && qr) {
    return (
      <div className="space-y-4 text-center">
        <div>
          <p className="text-sm font-semibold text-ink">Pague {brl(plan.priceCents)} no Pix para liberar 30 dias</p>
          <p className="mt-0.5 text-xs text-muted">Abra o app do banco, escaneie o QR ou use o copia-e-cola. A confirmação é automática.</p>
        </div>
        <div className="mx-auto w-fit rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${qr.encodedImage}`} alt="QR Code Pix" width={220} height={220} className="block" />
        </div>
        <div className="space-y-2">
          <span className={labelCls}>Pix copia-e-cola</span>
          <div className="flex gap-2">
            <input readOnly value={qr.payload} className={`${inputCls} truncate font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={copy} className="shrink-0 rounded-input border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted">
          <span className="dot-live inline-block h-2 w-2 rounded-full bg-accent" />
          Aguardando pagamento…
        </div>
        <button type="button" onClick={() => paymentId && checkStatus(paymentId)} className="text-xs font-semibold text-accent underline-offset-2 hover:underline">
          Já paguei
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!fixedSlug && plans.length > 1 && (
        <div className="flex gap-2">
          {plans.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSlug(p.slug)}
              aria-pressed={slug === p.slug}
              className={`flex-1 rounded-input border py-2.5 text-sm font-semibold transition-colors ${slug === p.slug ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-line/80"}`}
            >
              {p.name} · {brl(p.priceCents)}
            </button>
          ))}
        </div>
      )}

      <label className="block">
        <span className={labelCls}>Seu CPF (para a cobrança Pix)</span>
        <input
          inputMode="numeric"
          value={cpf}
          onChange={(e) => setCpf(maskCpf(e.target.value))}
          placeholder="000.000.000-00"
          className={inputCls}
        />
      </label>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <button type="button" onClick={generate} disabled={phase === "loading"} className={btnPrimary}>
        {phase === "loading" ? "Gerando Pix…" : `Pagar ${brl(plan.priceCents)} no Pix`}
      </button>
      <p className="text-center text-xs text-muted">Pagamento à vista via Pix · vale 30 dias · renovação manual.</p>
    </div>
  );
}
