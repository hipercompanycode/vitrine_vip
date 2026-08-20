"use client";
import { useEffect, useRef, useState } from "react";
import { nextBumpAt } from "@/lib/bump";

function fmt(ms: number): string {
  if (ms >= 60_000) return `${Math.ceil(ms / 60_000)} min`;
  return `${Math.ceil(ms / 1000)}s`;
}

export default function BumpButton({ cooldownMinutes, bumpedAt }: { cooldownMinutes: number; bumpedAt: string | null }) {
  const baseNext = () => {
    const n = nextBumpAt(bumpedAt ? new Date(bumpedAt) : null, cooldownMinutes);
    return n ? n.getTime() : 0;
  };
  const [nextAt, setNextAt] = useState<number>(baseNext);
  const [now, setNow] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "wait" | "err"; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // evita mismatch de hidratação: só mostra o estado de espera após montar
  const remaining = mounted ? Math.max(0, nextAt - now) : 0;
  const waiting = remaining > 0;

  useEffect(() => { setMounted(true); setNow(Date.now()); }, []);
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  function showToast(kind: "ok" | "wait" | "err", text: string) {
    setToast({ kind, text });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4500);
  }

  async function bump() {
    if (busy || waiting) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ads/bump", { method: "POST" });
      if (res.ok) {
        if (cooldownMinutes > 0) { setNextAt(Date.now() + cooldownMinutes * 60_000); setNow(Date.now()); }
        showToast("ok", cooldownMinutes > 0
          ? `Seu anúncio subiu pro topo! Você pode subir de novo em ${cooldownMinutes} min.`
          : "Seu anúncio subiu pro topo!");
      } else if (res.status === 429) {
        const j = await res.json().catch(() => ({} as { remainingMs?: number }));
        const rem = Number(j.remainingMs) || 0;
        if (rem > 0) { setNextAt(Date.now() + rem); setNow(Date.now()); }
        showToast("wait", `Você subiu faz pouco. Pode subir de novo em ${fmt(rem)}.`);
      } else {
        showToast("err", "Não deu pra subir agora. Tente de novo.");
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
        onClick={bump}
        disabled={busy || waiting}
        className="flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-line disabled:hover:text-ink"
      >
        {waiting ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Subir de novo em {fmt(remaining)}
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {busy ? "Subindo…" : "Subir pro topo"}
          </>
        )}
      </button>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            role="status"
            className={`flex items-center gap-2 rounded-pill border px-4 py-2.5 text-sm font-semibold shadow-pop ${
              toast.kind === "ok"
                ? "border-[#1f6b3f] bg-[#0f2a1b] text-[#7ee2a8]"
                : toast.kind === "wait"
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-red-500/40 bg-red-500/15 text-red-200"
            }`}
          >
            {toast.kind === "ok" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : toast.kind === "wait" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
