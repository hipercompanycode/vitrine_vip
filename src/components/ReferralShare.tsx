"use client";
import { useState } from "react";

export default function ReferralShare({ code, count, referredBy }: { code: string; count: number; referredBy?: string | null }) {
  const [copied, setCopied] = useState<"" | "code" | "link">("");
  const link = `https://vitrinevip.com.br/?ref=${code}`;
  const msg = `Vem anunciar comigo na Vitrine VIP! Usa meu código ${code} no cadastro 💗 ${link}`;

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  }

  const btn = "shrink-0 rounded-input border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent";

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" /><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" /><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth="1.8" /></svg>
        </span>
        <div>
          <p className="font-display text-sm font-bold text-ink">Indique e fortaleça a vitrine</p>
          <p className="text-[11px] text-muted">Compartilhe seu código com outras acompanhantes</p>
        </div>
      </div>

      {referredBy && (
        <p className="mt-2.5 rounded-input bg-surface-2/50 px-3 py-2 text-xs text-muted">Você foi indicada por <strong className="text-ink">{referredBy}</strong>. 💗</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 truncate rounded-input border border-line bg-surface-2 px-3 py-2 text-center font-mono text-base font-extrabold tracking-[0.3em] text-accent">{code}</div>
        <button type="button" onClick={() => copy(code, "code")} className={btn}>{copied === "code" ? "Copiado ✓" : "Copiar"}</button>
      </div>

      <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-input bg-[#25D366] px-3 py-2.5 text-sm font-bold text-[#05340f] transition-opacity hover:opacity-90">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 0 1 12 4zm-2.9 4.3c-.2 0-.5 0-.7.4-.2.4-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.7 2.7 4.3 3.7 2.1.8 2.5.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.6.8c-.1.1-.3.2-.5.1-.7-.3-1.4-.5-2.2-1.6-.2-.3.2-.5.4-.9.1-.1.1-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4z" /></svg>
        Compartilhar no WhatsApp
      </a>

      <p className="mt-2.5 text-xs text-muted">Você já indicou <strong className="text-ink">{count}</strong> {count === 1 ? "pessoa" : "pessoas"}.</p>
    </div>
  );
}
