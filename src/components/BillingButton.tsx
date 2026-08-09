"use client";
import { useState } from "react";
import { btnSecondary } from "@/components/ui";

export default function BillingButton() {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.url) window.location.href = data.url;
  }
  return <button onClick={open} disabled={busy} className={btnSecondary}>{busy ? "Abrindo…" : "Gerenciar assinatura"}</button>;
}
