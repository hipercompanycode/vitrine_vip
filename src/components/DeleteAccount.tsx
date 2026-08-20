"use client";
import { useState } from "react";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canDelete = text.trim().toUpperCase() === "EXCLUIR";

  async function del() {
    if (!canDelete || busy) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Falha ao excluir."); setBusy(false); return; }
      window.location.href = "/";
    } catch {
      setErr("Sem conexão. Tente de novo."); setBusy(false);
    }
  }

  return (
    <>
      <section className="rounded-card border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="font-display text-base font-bold text-red-300">Zona de perigo</h2>
        <p className="mb-4 mt-0.5 text-xs text-muted">Excluir sua conta apaga permanentemente seu perfil, anúncio, fotos e comprovações. Não dá pra desfazer.</p>
        <button
          onClick={() => { setOpen(true); setText(""); setErr(""); }}
          className="rounded-input border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
        >
          Excluir minha conta
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/85 px-4 backdrop-blur-sm" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            </span>
            <h3 className="text-center font-display text-lg font-bold text-ink">Excluir conta definitivamente?</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-center text-sm text-muted">
              Isso apaga <strong className="text-ink">tudo</strong>: perfil, anúncio, fotos, comprovações e assinatura. Esta ação é <strong className="text-red-300">irreversível</strong>.
            </p>

            <label className="mt-5 block">
              <span className="mb-1 block text-xs font-medium text-muted">Digite <strong className="text-ink">EXCLUIR</strong> para confirmar</span>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="EXCLUIR"
                autoComplete="off"
                className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-red-500/60 focus:outline-none"
              />
            </label>

            {err && <p className="mt-3 rounded-input bg-red-500/15 px-3 py-2 text-sm text-red-300">{err}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={del}
                disabled={!canDelete || busy}
                className="flex-1 rounded-input bg-red-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Excluindo…" : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
