"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

// Popup de confirmação (ex.: "deseja mesmo excluir?"). Renderiza sobre a página.
export default function ConfirmDialog({
  open, title, message, confirmLabel = "Excluir", busy = false, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-6 text-center shadow-pop" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-muted">{message}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-input border border-line bg-surface-2 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-input bg-red-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {busy ? "Excluindo…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
