import Link from "next/link";
import { formatBRL, timeAgo } from "@/lib/format";
import CardMediaPlaceholder from "./CardMediaPlaceholder";
import AvailableBadge from "./AvailableBadge";
import LikeButton from "./LikeButton";
import FavoriteButton from "./FavoriteButton";
import type { AdCardData } from "./AdCard";

export default function AdDetail({
  ad,
  now,
  backHref = "/",
  interactions,
}: {
  ad: AdCardData;
  now: Date;
  backHref?: string;
  interactions?: {
    likeCount: number;
    liked: boolean;
    favorited: boolean;
    canInteract: boolean;
    loggedIn: boolean;
  };
}) {
  const digits = ad.whatsapp.replace(/\D/g, "");
  const waText = encodeURIComponent(`Olá! Vi seu anúncio "${ad.title}" e tenho interesse.`);
  const waHref = digits ? `https://wa.me/${digits}?text=${waText}` : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 sm:pb-16">
      <div className="py-4">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Voltar
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-card border border-line shadow-card">
        <CardMediaPlaceholder title={ad.title} className="aspect-[16/10] w-full" />
        {ad.is_available && (
          <div className="absolute left-4 top-4">
            <AvailableBadge />
          </div>
        )}
        <span className="absolute right-4 top-4 rounded-pill bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {timeAgo(new Date(ad.created_at), now)}
        </span>
      </div>

      <div className="mt-6">
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
          {ad.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            {formatBRL(ad.price_cents)}
          </span>
          {ad.city && (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="11" r="2.2" fill="currentColor" />
              </svg>
              {ad.city.name}-{ad.city.uf}
            </span>
          )}
        </div>

        {interactions && (
          <div className="mt-4 flex flex-wrap gap-2">
            <LikeButton adId={ad.id} initialActive={interactions.liked} initialCount={interactions.likeCount}
              canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
            <FavoriteButton adId={ad.id} initialActive={interactions.favorited}
              canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
          </div>
        )}

        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">
          {ad.description || "Sem descrição."}
        </p>
      </div>

      {/* CTA WhatsApp — fixo no rodapé no mobile, inline no desktop */}
      {waHref && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 p-4 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto max-w-3xl">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-wa px-5 py-3.5 text-base font-semibold text-white shadow-pop transition-all hover:bg-wa-strong active:scale-[0.99]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.5 14.4c-.3-.15-1.7-.83-2-.93-.26-.1-.45-.15-.65.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.29-.02-.45.13-.6.13-.13.29-.33.44-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.65-1.57-.9-2.15-.24-.56-.48-.48-.65-.49h-.56c-.19 0-.5.07-.77.36s-1.01.99-1.01 2.41 1.04 2.8 1.18 2.99c.15.19 2.05 3.13 4.96 4.39.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.7-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.56-.34z" />
                <path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.05-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3 .78.8-2.92-.2-.31A8.2 8.2 0 1 1 12 20.2z" />
              </svg>
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
