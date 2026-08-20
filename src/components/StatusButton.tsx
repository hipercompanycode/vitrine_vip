"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusButton({ initialPaused }: { initialPaused: boolean }) {
  const router = useRouter();
  const [paused, setPaused] = useState(initialPaused);
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
    const next = paused ? "active" : "paused";
    try {
      const res = await fetch("/api/ads/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setPaused(next === "paused");
        showToast(next === "paused" ? "off" : "on", next === "paused"
          ? "Anúncio pausado — não aparece na vitrine."
          : "Anúncio reativado! Já está no ar.");
        // sincroniza o resto do painel (banner, ações) sem sumir com a página
        router.refresh();
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
        className={`flex w-full items-center justify-center gap-2 rounded-input py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
          paused
            ? "bg-accent text-white hover:bg-accent-strong"
            : "border border-line bg-surface text-ink hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300"
        }`}
      >
        {paused ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5l12 7-12 7V5z" fill="currentColor" /></svg>
            {busy ? "Reativando…" : "Reativar anúncio"}
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
            {busy ? "Pausando…" : "Pausar anúncio"}
          </>
        )}
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
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
