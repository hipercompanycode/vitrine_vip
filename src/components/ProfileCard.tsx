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
  ratio?: "tall" | "portrait" | "square"; // ignorado (cards uniformes) — compat
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
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
        p.featured ? "border-accent/70" : "border-line"
      }`}
    >
      <Link href={`${hrefBase}/${p.id}`} aria-label={`Ver anúncio de ${p.name}`} className="absolute inset-0 z-[1]" />

      {/* FOTO — um pouco mais baixa (aspect 4/5) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ background: `linear-gradient(150deg, hsl(${hue} 58% 27%), hsl(${(hue + 40) % 360} 48% 12%))` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="select-none font-display text-6xl font-black text-white/10">{p.name.charAt(0)}</span>
        </div>

        {/* topo-esquerda: Verificada + gravada + contadores */}
        <div className="absolute left-2 top-2 z-[2] flex flex-col items-start gap-1">
          {p.verified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#12331f]/90 px-1.5 py-0.5 text-[10px] font-bold text-[#43d17f] backdrop-blur-sm">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Verificada
            </span>
          )}
          {p.recordedAt && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Gravada às {p.recordedAt}
            </span>
          )}
          <div className="flex items-center gap-1">
            {typeof p.videoCount === "number" && p.videoCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{p.videoCount}
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
        <div className="absolute right-2 top-2 z-[2] flex items-center gap-1.5">
          {p.featured && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white shadow-pop">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" /></svg>TOP
            </span>
          )}
          <button type="button" aria-label="Favoritar" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:text-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20s-6.5-4.2-9-8C1.2 8.5 3 5 6.3 5 8.2 5 9.4 6.1 12 8.3 14.6 6.1 15.8 5 17.7 5 21 5 22.8 8.5 21 12c-2.5 3.8-9 8-9 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
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
      </div>

      {/* INFOS embaixo (mais espaço) */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h3 className="truncate font-display text-[15px] font-bold text-ink">{p.name}</h3>
          {p.age > 0 && <span className="shrink-0 text-xs font-medium text-muted">· {p.age} anos</span>}
        </div>
        <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-muted">{p.description}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="11" r="2.2" fill="currentColor" /></svg>
          <span className="truncate text-[12px] text-muted">{p.city}</span>
          {p.priceLabel && <span className="ml-auto whitespace-nowrap font-display text-base font-extrabold text-ink">{p.priceLabel}</span>}
        </div>
      </div>
    </article>
  );
}
