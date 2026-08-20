"use client";
import { useRef, useState } from "react";

export default function AvailabilityButton({ initialAvailable }: { initialAvailable: boolean }) {
  const [available, setAvailable] = useState(initialAvailable);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "on" | "off" | "err"; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(kind: "on" | "off" | "err", text: string) {
    setToast({ kind, text });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4000);
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !available;
    try {
      const res = await fetch("/api/ads/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });
      if (res.ok) {
        setAvailable(next);
        showToast(next ? "on" : "off", next ? "Você está disponível agora! Seu anúncio ganha destaque." : "Disponibilidade desligada.");
      } else {
        showToast("err", "Não deu pra atualizar agora. Tente de novo.");
      }
    } catch {
      showToast("err", "Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-input py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
          available ? "bg-available text-[#08351d] hover:opacity-90" : "border border-line bg-surface text-ink hover:bg-accent-soft"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${available ? "bg-[#08351d]" : "bg-available"}`} />
        {busy ? "Atualizando…" : available ? "Disponível agora — tocar para desligar" : "Marcar como disponível agora"}
      </button>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            role="status"
            className={`flex items-center gap-2 rounded-pill border px-4 py-2.5 text-sm font-semibold shadow-pop ${
              toast.kind === "on"
                ? "border-[#1f6b3f] bg-[#0f2a1b] text-[#7ee2a8]"
                : toast.kind === "off"
                ? "border-line bg-surface text-muted"
                : "border-red-500/40 bg-red-500/15 text-red-200"
            }`}
          >
            {toast.kind === "on" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : toast.kind === "off" ? (
              <span className="h-2 w-2 rounded-full bg-muted" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /></svg>
            )}
            {toast.text}
          </div>
        </div>
      )}
    </>
  );
}
