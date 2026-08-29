"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// Play central no card: abre o story em tela cheia (com áudio), sem entrar no
// anúncio. Um botão "Ver anúncio" leva pra dentro. Marca d'água + sem download.
export default function CardStoryButton({ storyUrl, adId, name }: { storyUrl: string; adId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={`Assistir story de ${name}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="absolute left-1/2 top-1/2 z-[3] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/80 backdrop-blur-sm transition-transform hover:scale-110"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 px-4 py-6" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                src={storyUrl}
                autoPlay
                controls
                playsInline
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                onEnded={() => setOpen(false)}
                className="aspect-[9/16] max-h-[74vh] w-full bg-black object-contain"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="-rotate-[18deg] select-none font-display text-xl font-extrabold tracking-wide text-white/30 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">vitrinevip.com.br</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30 backdrop-blur-sm transition-colors hover:bg-black/80"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>

            <Link
              href={`/anuncio/${adId}`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill bg-accent px-5 py-3 text-sm font-bold text-white shadow-pop transition-colors hover:bg-accent-strong"
            >
              Ver anúncio de {name}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
