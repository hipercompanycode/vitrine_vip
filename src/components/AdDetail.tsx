import Link from "next/link";
import { formatBRL, timeAgo } from "@/lib/format";
import LikeButton from "./LikeButton";
import FavoriteButton from "./FavoriteButton";
import Gallery, { type GalleryItem } from "./Gallery";
import StoryCover from "./StoryCover";
import AvailableBadge from "./AvailableBadge";
import type { AdCardData } from "./AdCard";
import { ATTRIBUTE_GROUPS } from "@/lib/attributes";

type PriceRow = { label: string; price_cents: number };
type Extra = {
  age?: number | null;
  verified?: boolean;
  attributes?: string[];
  priceTable?: PriceRow[];
  stats?: { dias: number; ultimaVerif: number | null; nFotos: number; nVideos: number };
};

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-medium uppercase leading-tight tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-display text-lg font-extrabold text-ink">{value}</div>
    </div>
  );
}

function CategoryIcon({ title }: { title: string }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  if (title === "Aparência")
    return <svg {...common}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" fill="currentColor" /><path d="M19 14l.7 1.9L21.6 17l-1.9.6L19 20l-.7-2.4L16.4 17l1.9-.9L19 14z" fill="currentColor" opacity=".7" /></svg>;
  if (title === "Serviços")
    return <svg {...common}><path d="M12 20s-6.5-4.2-9-8C1.2 8.5 3 5 6.3 5 8.2 5 9.4 6.1 12 8.3 14.6 6.1 15.8 5 17.7 5 21 5 22.8 8.5 21 12c-2.5 3.8-9 8-9 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (title === "Lugar")
    return <svg {...common}><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="11" r="2.3" fill="currentColor" /></svg>;
  // Principais
  return <svg {...common}><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /></svg>;
}

export default function AdDetail({
  ad, now, backHref = "/", interactions, coverUrl, storyUrl, media, extra,
}: {
  ad: AdCardData;
  now: Date;
  backHref?: string;
  interactions?: { likeCount: number; liked: boolean; favorited: boolean; canInteract: boolean; loggedIn: boolean };
  coverUrl?: string | null;
  storyUrl?: string | null;
  media?: GalleryItem[];
  extra?: Extra;
}) {
  const digits = ad.whatsapp.replace(/\D/g, "");
  const waText = encodeURIComponent(`Olá! Vi seu anúncio "${ad.title}" e tenho interesse.`);
  const waHref = digits ? `https://wa.me/${digits}?text=${waText}` : null;

  const attrs = new Set(extra?.attributes ?? []);
  const about: { title: string; label?: string; items: string[] }[] = ATTRIBUTE_GROUPS
    .map((g) => ({ title: g.title, label: g.label, items: g.items.filter((it) => attrs.has(it.slug)).map((it) => it.label) }))
    .filter((g) => g.items.length > 0);

  const priceTable = extra?.priceTable ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 sm:pb-16">
      <div className="py-4">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Voltar
        </Link>
      </div>

      {/* Reputação / stats */}
      {extra?.stats && (
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-card border border-accent/30 bg-gradient-to-b from-accent-soft/50 to-surface p-3">
          <StatTile label="Dias anunciado" value={extra.stats.dias} />
          <StatTile label="Fotos" value={extra.stats.nFotos} />
          <StatTile label="Vídeos" value={extra.stats.nVideos} />
        </div>
      )}

      {/* Capa */}
      <div className="relative overflow-hidden rounded-card border border-line shadow-card">
        <StoryCover title={ad.title} coverUrl={coverUrl} storyUrl={storyUrl} className="aspect-[4/5] w-full sm:aspect-[16/11]" />
        {ad.is_available && <div className="absolute left-4 top-4"><AvailableBadge /></div>}
        <span className="absolute right-4 top-4 rounded-pill bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{timeAgo(new Date(ad.created_at), now)}</span>
      </div>

      <div className="mt-6">
        <div className="flex items-start gap-2">
          <h1 className="flex-1 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">{ad.title}</h1>
          {extra?.verified && (
            <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#12331f] px-2.5 py-1 text-xs font-bold text-[#43d17f]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Verificada
            </span>
          )}
        </div>

        {/* tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ad.city && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="11" r="2.2" fill="currentColor" /></svg>
              {ad.city.name}-{ad.city.uf}
            </span>
          )}
          {extra?.age ? <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">{extra.age} anos</span> : null}
        </div>

        {/* preço */}
        <div className="mt-4">
          <span className="text-xs text-muted">A partir de</span>
          <div className="font-display text-3xl font-extrabold text-accent">{formatBRL(ad.price_cents)}</div>
        </div>

        {interactions && (
          <div className="mt-4 flex flex-wrap gap-2">
            <LikeButton adId={ad.id} initialActive={interactions.liked} initialCount={interactions.likeCount} canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
            <FavoriteButton adId={ad.id} initialActive={interactions.favorited} canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
          </div>
        )}

        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-pill bg-wa px-5 py-3.5 text-base font-semibold text-white shadow-pop transition-all hover:bg-wa-strong active:scale-[0.99]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.15-1.7-.83-2-.93-.26-.1-.45-.15-.65.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.29-.02-.45.13-.6.13-.13.29-.33.44-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.65-1.57-.9-2.15-.24-.56-.48-.48-.65-.49h-.56c-.19 0-.5.07-.77.36s-1.01.99-1.01 2.41 1.04 2.8 1.18 2.99c.15.19 2.05 3.13 4.96 4.39.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.7-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.56-.34z" /><path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.05-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3 .78.8-2.92-.2-.31A8.2 8.2 0 1 1 12 20.2z" /></svg>
            Chamar no WhatsApp
          </a>
        )}

        {/* descrição */}
        <section className="mt-8">
          <h2 className="mb-2 font-display text-lg font-bold text-ink">Sobre o anúncio</h2>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{ad.description || "Sem descrição."}</p>
        </section>

        {/* tabela de preços */}
        {priceTable.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 font-display text-lg font-bold text-ink">Valores</h2>
            <ul className="divide-y divide-line/70 rounded-card border border-line bg-surface">
              {priceTable.map((r, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-ink">{r.label}</span>
                  <span className="font-display font-bold text-accent">{formatBRL(r.price_cents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sobre mim (atributos) — ficha em linhas */}
        {about.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Sobre mim</h2>
            <div className="rounded-card border border-line bg-surface px-4 shadow-card sm:px-5">
              {about.map((g, i) => (
                <div key={i} className="flex flex-col gap-2 border-b border-line/60 py-3.5 last:border-0 sm:flex-row sm:gap-4">
                  <div className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium text-muted">
                    <span className="text-accent"><CategoryIcon title={g.title} /></span>
                    {g.label ?? g.title}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((label) => (
                      <span key={label} className="rounded-pill bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent-strong">{label}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* galeria */}
        {media && media.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Fotos e vídeos</h2>
            <Gallery items={media} />
          </section>
        )}
      </div>
    </main>
  );
}
