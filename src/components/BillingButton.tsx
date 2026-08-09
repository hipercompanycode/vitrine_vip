"use client";
import { useState } from "react";
import { btnSecondary } from "@/components/ui";

export default function BillingButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function open() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setErr("Não foi possível abrir o portal de cobrança.");
      setBusy(false);
      return;
    }
    window.location.href = data.url;
  }
  return (
    <div className="space-y-1">
      <button onClick={open} disabled={busy} className={btnSecondary}>{busy ? "Abrindo…" : "Gerenciar assinatura"}</button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
