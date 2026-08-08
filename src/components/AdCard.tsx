import Link from "next/link";
import { formatBRL, timeAgo } from "@/lib/format";
import WhatsAppButton from "./WhatsAppButton";
import CardMediaPlaceholder from "./CardMediaPlaceholder";
import AvailableBadge from "./AvailableBadge";

export type AdCardData = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  is_available: boolean;
  created_at: string;
  city: { name: string; uf: string } | null;
  whatsapp: string;
  like_count?: number;
};

export default function AdCard({
  ad,
  now,
  index = 0,
  hrefBase = "/anuncio",
}: {
  ad: AdCardData;
  now: Date;
  index?: number;
  hrefBase?: string;
}) {
  return (
    <article
      className="animate-rise group relative flex cursor-pointer flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      {/* link esticado: cobre o card inteiro; WhatsApp fica acima (z maior) */}
      <Link
        href={`${hrefBase}/${ad.id}`}
        aria-label={`Ver anúncio: ${ad.title}`}
        className="absolute inset-0 z-[1]"
      />

      <div className="relative">
        <CardMediaPlaceholder title={ad.title} className="aspect-[4/3] w-full" />
        {ad.is_available && (
          <div className="absolute left-3 top-3">
            <AvailableBadge />
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-pill bg-ink/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {timeAgo(new Date(ad.created_at), now)}
        </span>
        {typeof ad.like_count === "number" && ad.like_count > 0 && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-pill bg-ink/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" />
            </svg>
            {ad.like_count}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-display text-[15px] font-bold leading-tight text-ink transition-colors group-hover:text-accent">
          {ad.title}
        </h3>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-muted">
          {ad.description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            <div className="font-display text-xl font-extrabold tracking-tight text-ink">
              {formatBRL(ad.price_cents)}
            </div>
            {ad.city && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="12" cy="11" r="2.2" fill="currentColor" />
                </svg>
                <span className="truncate">
                  {ad.city.name}-{ad.city.uf}
                </span>
              </div>
            )}
          </div>
          {/* acima do link esticado para permanecer clicável */}
          <span className="relative z-10">
            <WhatsAppButton phone={ad.whatsapp} adTitle={ad.title} />
          </span>
        </div>
      </div>
    </article>
  );
}
