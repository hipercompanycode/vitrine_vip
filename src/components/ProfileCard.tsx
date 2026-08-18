import Link from "next/link";

export type ProfileCardData = {
  id: string;
  name: string;
  age: number;
  city: string;
  description: string;
  verified?: boolean;
  videoCount?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
  recordedAt?: string | null; // "13:07" -> chip "Gravada às 13:07"
  featured?: boolean;
  priceLabel?: string | null;
  hue?: number;
  ratio?: "tall" | "portrait" | "square"; // ignorado (cards uniformes) — mantido p/ compat
};

export default function ProfileCard({
  p,
  hrefBase = "/preview/anuncio",
}: {
  p: ProfileCardData;
  hrefBase?: string;
}) {
  const hue = p.hue ?? 320;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
        p.featured ? "border-accent/70" : "border-line"
      }`}
    >
      <Link href={`${hrefBase}/${p.id}`} aria-label={`Ver anúncio de ${p.name}`} className="absolute inset-0 z-[1]" />

      {/* Todas as imagens no MESMO tamanho (aspect fixo) */}
      <div className="relative aspect-[3/4] w-full">
        {/* placeholder (a foto real vem do anunciante) */}
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ background: `linear-gradient(150deg, hsl(${hue} 58% 27%), hsl(${(hue + 40) % 360} 48% 12%))` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="select-none font-display text-6xl font-black text-white/10">{p.name.charAt(0)}</span>
        </div>

        {/* scrim inferior p/ legibilidade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

        {/* topo-esquerda: gravada + contadores */}
        <div className="absolute left-2 top-2 z-[2] flex flex-col items-start gap-1">
          {p.recordedAt && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Gravada às {p.recordedAt}
            </span>
          )}
          <div className="flex items-center gap-1">
            {typeof p.videoCount === "number" && p.videoCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                {p.videoCount}
              </span>
            )}
            {p.hasAudio && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z" /></svg>
              </span>
            )}
          </div>
        </div>

        {/* topo-direita: destaque + coração */}
        <div className="absolute right-2 top-2 z-[2] flex items-center gap-1">
          {p.featured && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white shadow-pop">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" /></svg>
              TOP
            </span>
          )}
          <button
            type="button"
            aria-label="Favoritar"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20s-6.5-4.2-9-8C1.2 8.5 3 5 6.3 5 8.2 5 9.4 6.1 12 8.3 14.6 6.1 15.8 5 17.7 5 21 5 22.8 8.5 21 12c-2.5 3.8-9 8-9 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* play central */}
        {p.hasVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 ring-2 ring-white/70 backdrop-blur-sm transition-transform group-hover:scale-110">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        )}

        {/* info sobre a imagem (mantém card uniforme) */}
        <div className="absolute inset-x-0 bottom-0 z-[2] p-2.5">
          <div className="flex items-center gap-1">
            <h3 className="truncate font-display text-sm font-bold text-white">{p.name}</h3>
            {p.age > 0 && <span className="whitespace-nowrap text-xs font-medium text-white/85">· {p.age}</span>}
            {p.verified && (
              <span title="Verificada" className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/75">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="11" r="2.2" fill="currentColor" />
            </svg>
            <span className="truncate">{p.city}</span>
            {p.priceLabel && <span className="ml-auto whitespace-nowrap font-bold text-white">{p.priceLabel}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
