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
  hue?: number; // 0-360 para o gradiente do placeholder
  ratio?: "tall" | "portrait" | "square"; // varia altura (masonry)
};

const RATIO: Record<NonNullable<ProfileCardData["ratio"]>, string> = {
  tall: "aspect-[3/5]",
  portrait: "aspect-[3/4]",
  square: "aspect-[4/5]",
};

export default function ProfileCard({
  p,
  hrefBase = "/preview/anuncio",
}: {
  p: ProfileCardData;
  hrefBase?: string;
}) {
  const hue = p.hue ?? 320;
  const ratio = RATIO[p.ratio ?? "portrait"];

  return (
    <article className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <Link href={`${hrefBase}/${p.id}`} aria-label={`Ver anúncio de ${p.name}`} className="absolute inset-0 z-[1]" />

      {/* Foto (placeholder — a real vem do anunciante) */}
      <div className={`relative w-full ${ratio}`}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(150deg, hsl(${hue} 55% 26%), hsl(${(hue + 40) % 360} 45% 14%))`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="select-none font-display text-6xl font-black text-white/10">
            {p.name.charAt(0)}
          </span>
        </div>

        {/* chip "Gravada às HH:MM" */}
        {p.recordedAt && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Gravada às {p.recordedAt}
          </span>
        )}

        {/* play central (tem vídeo/story) */}
        {p.hasVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 ring-2 ring-white/70 backdrop-blur-sm transition-transform group-hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        )}

        {/* Ver anúncio (destaque) */}
        {p.featured && (
          <span className="absolute bottom-2 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-md bg-accent px-3 py-1 text-[11px] font-bold text-white shadow-pop">
            Ver anúncio
          </span>
        )}

        {/* coração favoritar */}
        <button
          type="button"
          aria-label="Favoritar"
          className="absolute bottom-2 right-2 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:text-accent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20s-6.5-4.2-9-8C1.2 8.5 3 5 6.3 5 8.2 5 9.4 6.1 12 8.3 14.6 6.1 15.8 5 17.7 5 21 5 22.8 8.5 21 12c-2.5 3.8-9 8-9 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 p-2.5">
        {p.featured && (
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-accent" aria-hidden="true">
              <path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" />
            </svg>
            <span className="font-display text-sm font-bold text-ink">{p.name}</span>
          </div>
        )}

        <p className="line-clamp-2 text-[13px] leading-snug text-muted">{p.description}</p>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="truncate">{p.city}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{p.age} anos</span>
          {p.priceLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap font-semibold text-ink">{p.priceLabel}</span>
            </>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {p.verified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#12331f] px-1.5 py-0.5 text-[10px] font-semibold text-[#43d17f]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verificada
            </span>
          )}
          {typeof p.videoCount === "number" && p.videoCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#3a2410] px-1.5 py-0.5 text-[10px] font-semibold text-[#f3a24a]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              {p.videoCount}
            </span>
          )}
          {p.hasAudio && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 9v6h4l5 5V4L8 9H4z" />
              </svg>
              Áudio
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
