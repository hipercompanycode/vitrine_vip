import Link from "next/link";
import CardFavoriteHeart from "@/components/CardFavoriteHeart";

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
  featured?: boolean; // dono no plano Premium -> destaque forte + selo TOP
  available?: boolean; // "disponível agora" -> destaque verde
  priceLabel?: string | null;
  hue?: number;
  cover?: string | null; // URL da foto de capa (se houver)
  coverBlurred?: boolean; // capa é nudez e o viewer é anônimo → borrada + "entre para ver"
  favorited?: boolean; // já está nos favoritos do usuário logado
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
  const premium = !!p.featured;
  const available = !!p.available;
  const shell = premium
    ? "border-transparent bg-gradient-to-b from-accent-soft/55 via-surface to-surface ring-2 ring-accent shadow-lift"
    : available
    ? "border-available/45 bg-surface ring-1 ring-available/40"
    : "border-line bg-surface";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${shell}`}
    >
      <Link href={`${hrefBase}/${p.id}`} aria-label={`Ver anúncio de ${p.name}`} className="absolute inset-0 z-[1]" />

      {/* FOTO — um pouco mais baixa (aspect 4/5) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ background: `linear-gradient(150deg, hsl(${hue} 58% 27%), hsl(${(hue + 40) % 360} 48% 12%))` }}
        />
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.cover}
            alt={p.name}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${p.coverBlurred ? "scale-110" : ""}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="select-none font-display text-6xl font-black text-white/10">{p.name.charAt(0)}</span>
          </div>
        )}
        {p.coverBlurred && (
          <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1 bg-black/30 backdrop-blur-[3px]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-white/90" aria-hidden="true"><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.4 5.2A9.3 9.3 0 0 1 12 5c5 0 9 5 9 7 0 .8-.9 2.3-2.4 3.6M6.2 6.7C3.9 8.1 3 9.9 3 12c0 2 4 7 9 7 1.2 0 2.3-.2 3.3-.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-[10px] font-semibold text-white/90">Entre para ver</span>
          </div>
        )}

        {/* topo-esquerda: Disponível + Verificada + gravada + contadores */}
        <div className="absolute left-2 top-2 z-[2] flex flex-col items-start gap-1">
          {available && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#0f2a1b]/90 px-1.5 py-0.5 text-[10px] font-bold text-[#43d17f] shadow-sm ring-1 ring-[#43d17f]/40 backdrop-blur-sm">
              <span className="dot-live h-1.5 w-1.5 rounded-full bg-[#43d17f]" />
              Disponível agora
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
          {premium && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-gradient-to-r from-accent-strong to-accent px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-pop ring-1 ring-white/25">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" /></svg>TOP
            </span>
          )}
          <CardFavoriteHeart adId={p.id} initialFavorited={p.favorited} />
        </div>

        {/* play central */}
        {p.hasVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 ring-2 ring-white/70 backdrop-blur-sm transition-transform group-hover:scale-110">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        )}

        {/* rodapé-direita da foto: Verificada */}
        {p.verified && (
          <span className="absolute bottom-2 right-2 z-[2] inline-flex items-center gap-1 rounded-md bg-[#12331f]/90 px-1.5 py-0.5 text-[10px] font-bold text-[#43d17f] shadow-sm ring-1 ring-[#43d17f]/30 backdrop-blur-sm">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Verificada
          </span>
        )}
      </div>

      {/* INFOS embaixo (mais espaço) */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h3 className="truncate font-display text-[15px] font-bold text-ink">{p.name}</h3>
          {p.age > 0 && <span className="shrink-0 text-xs font-medium text-muted">· {p.age} anos</span>}
        </div>
        <p className="line-clamp-3 min-h-[3.6rem] text-[13px] leading-snug text-muted">{p.description}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="11" r="2.2" fill="currentColor" /></svg>
          <span className="truncate text-[12px] text-muted">{p.city}</span>
          {p.priceLabel && <span className={`ml-auto whitespace-nowrap font-display text-base font-extrabold ${premium ? "text-accent" : "text-ink"}`}>{p.priceLabel}</span>}
        </div>
      </div>
    </article>
  );
}
