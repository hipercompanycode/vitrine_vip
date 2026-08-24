"use client";
import { useEffect, useState } from "react";

type Photo = { label: string; url: string | null };

// Miniaturas das comprovações + visualizador em tela cheia (lightbox) para ver o detalhe.
export default function VerificationPhotos({ photos }: { photos: Photo[] }) {
  const usable = photos.map((p, i) => ({ ...p, i })).filter((p) => p.url);
  const [open, setOpen] = useState<number | null>(null); // índice em `photos`

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function step(dir: number) {
    setOpen((cur) => {
      if (cur === null || usable.length === 0) return cur;
      const pos = usable.findIndex((u) => u.i === cur);
      return usable[(pos + dir + usable.length) % usable.length].i;
    });
  }

  const current = open !== null ? photos[open] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={p.label}>
            <p className="mb-1 text-xs font-semibold text-muted">{p.label}</p>
            {p.url ? (
              <button type="button" onClick={() => setOpen(i)} aria-label={`Ampliar ${p.label}`} className="group relative block w-full overflow-hidden rounded-input border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label} className="h-40 w-full object-cover transition-opacity group-hover:opacity-90" />
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Ampliar
                </span>
              </button>
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-input border border-dashed border-line text-xs text-muted">—</div>
            )}
          </div>
        ))}
      </div>

      {current?.url && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-white">{current.label}</span>
            <button type="button" onClick={() => setOpen(null)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center gap-2 overflow-hidden px-4 pb-6" onClick={(e) => e.stopPropagation()}>
            {usable.length > 1 && (
              <button type="button" onClick={() => step(-1)} aria-label="Anterior" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.label} className="max-h-full max-w-full rounded-lg object-contain" />
            {usable.length > 1 && (
              <button type="button" onClick={() => step(1)} aria-label="Próxima" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
