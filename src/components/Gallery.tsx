"use client";
import { useCallback, useEffect, useState } from "react";

export type GalleryItem = { url: string; type: "photo" | "video"; blurred?: boolean };

export default function Gallery({ items }: { items: GalleryItem[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  // índices só de fotos (navegação do lightbox pula vídeos)
  const photoIdx = items.map((it, i) => (it.type === "photo" ? i : -1)).filter((i) => i >= 0);

  const close = useCallback(() => setLightbox(null), []);
  const go = useCallback(
    (dir: 1 | -1) => {
      setLightbox((cur) => {
        if (cur == null || photoIdx.length === 0) return cur;
        const pos = photoIdx.indexOf(cur);
        const next = (pos + dir + photoIdx.length) % photoIdx.length;
        return photoIdx[next];
      });
    },
    [photoIdx]
  );

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, go]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="columns-1 gap-2.5 sm:columns-2">
        {items.map((it, i) =>
          it.type === "photo" && it.blurred ? (
            <a
              key={i}
              href="/login"
              className="relative mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-card border border-line bg-surface"
            >
              {it.url
                ? <img src={it.url} alt="" loading="lazy" decoding="async" className="block w-full scale-110 object-cover" style={{ aspectRatio: "3 / 4" }} />
                : <div className="w-full" style={{ aspectRatio: "3 / 4", background: "linear-gradient(150deg,#2a1330,#0d0812)" }} />}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/35 backdrop-blur-[3px]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-white/90" aria-hidden="true"><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.4 5.2A9.3 9.3 0 0 1 12 5c5 0 9 5 9 7 0 .8-.9 2.3-2.4 3.6M6.2 6.7C3.9 8.1 3 9.9 3 12c0 2 4 7 9 7 1.2 0 2.3-.2 3.3-.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold text-white">Entre para ver (+18)</span>
              </div>
            </a>
          ) : it.type === "photo" ? (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label="Ampliar foto"
              className="group relative mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-card border border-line bg-surface"
            >
              <img
                src={it.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ) : (
            <video
              key={i}
              src={it.url}
              controls
              playsInline
              className="mb-2.5 block w-full break-inside-avoid rounded-card border border-line bg-black"
            />
          )
        )}
      </div>

      {lightbox != null && items[lightbox]?.type === "photo" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {photoIdx.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label="Anterior"
                className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label="Próxima"
                className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </>
          )}

          <img
            src={items[lightbox].url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-card object-contain shadow-pop"
          />

          {photoIdx.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-pill bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {photoIdx.indexOf(lightbox) + 1} / {photoIdx.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
