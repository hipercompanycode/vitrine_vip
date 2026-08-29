import Link from "next/link";
import { formatBRL, timeAgo } from "@/lib/format";
import LikeButton from "./LikeButton";
import FavoriteButton from "./FavoriteButton";
import Gallery, { type GalleryItem } from "./Gallery";
import StoryCover from "./StoryCover";
import AvailableBadge from "./AvailableBadge";
import type { AdCardData } from "./AdCard";
import { ATTRIBUTE_GROUPS } from "@/lib/attributes";
import { VIDEO_ENABLED } from "@/lib/media";
import { SITE_NAME } from "@/lib/seo";
import TrackedContactLink from "./TrackedContactLink";

type PriceRow = { label: string; price_cents: number };
type Extra = {
  age?: number | null;
  verified?: boolean;
  faceHidden?: boolean;
  audioUrl?: string | null;
  attributes?: string[];
  priceTable?: PriceRow[];
  contact?: { whatsapp: boolean; call: boolean; telegram: boolean };
  stats?: { dias: number; ultimaVerif: number | null; nFotos: number; nVideos: number; nAvaliacoes: number };
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
  ad, now, backHref = "/", interactions, coverUrl, coverBlurred, storyUrl, media, extra,
}: {
  ad: AdCardData;
  now: Date;
  backHref?: string;
  interactions?: { likeCount: number; liked: boolean; favorited: boolean; canInteract: boolean; loggedIn: boolean };
  coverUrl?: string | null;
  coverBlurred?: boolean;
  storyUrl?: string | null;
  media?: GalleryItem[];
  extra?: Extra;
}) {
  // número nacional guardado (sem 55); o +55 (código do país) entra só aqui, no contato
  let national = ad.whatsapp.replace(/\D/g, "");
  if (national.length >= 12 && national.startsWith("55")) national = national.slice(2);
  const full = national ? `55${national}` : "";

  const attrs = new Set(extra?.attributes ?? []);

  // canais de contato escolhidos no anúncio (com fallback pro WhatsApp)
  const c = extra?.contact ?? { whatsapp: true, call: false, telegram: false };
  const contactMsg = `Olá! Vi seu anúncio no ${SITE_NAME} e gostaria de agendar um horário. Qual a sua disponibilidade?`;
  const enc = encodeURIComponent(contactMsg);
  const noneChosen = !c.whatsapp && !c.call && !c.telegram;
  const showWhats = !!full && (c.whatsapp || noneChosen);
  const showTelegram = !!full && c.telegram;
  const showCall = !!full && c.call;
  const waHref = full ? `https://wa.me/${full}?text=${enc}` : null;
  const tgHref = full ? `https://t.me/+${full}` : null;
  const telHref = full ? `tel:+${full}` : null;
  const about: { title: string; label?: string; items: string[] }[] = ATTRIBUTE_GROUPS
    .map((g) => ({ title: g.title, label: g.label, items: g.items.filter((it) => attrs.has(it.slug)).map((it) => it.label) }))
    .filter((g) => g.items.length > 0);

  const priceTable = extra?.priceTable ?? [];
  const minTable = priceTable.length ? Math.min(...priceTable.map((r) => r.price_cents)) : 0;
  const displayPrice = ad.price_cents > 0 ? ad.price_cents : minTable;

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
        <div className={`mb-4 grid ${VIDEO_ENABLED ? "grid-cols-4" : "grid-cols-3"} gap-2 rounded-card border border-accent/30 bg-gradient-to-b from-accent-soft/50 to-surface p-3`}>
          <StatTile label="Dias anunciado" value={extra.stats.dias} />
          <StatTile label="Avaliações" value={extra.stats.nAvaliacoes} />
          <StatTile label="Fotos" value={extra.stats.nFotos} />
          {VIDEO_ENABLED && <StatTile label="Vídeos" value={extra.stats.nVideos} />}
        </div>
      )}

      {/* Capa */}
      <div className="relative overflow-hidden rounded-card border border-line shadow-card">
        <StoryCover title={ad.title} coverUrl={coverUrl} coverBlurred={coverBlurred} storyUrl={storyUrl} className="aspect-[4/5] w-full sm:aspect-[16/11]" />
        {ad.is_available && <div className="absolute left-4 top-4"><AvailableBadge /></div>}
        <span className="absolute right-4 top-4 rounded-pill bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{timeAgo(new Date(ad.created_at), now)}</span>
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

        {interactions && (
          <div className="mt-3 flex flex-wrap gap-2">
            <LikeButton adId={ad.id} initialActive={interactions.liked} initialCount={interactions.likeCount} canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
            <FavoriteButton adId={ad.id} initialActive={interactions.favorited} canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
          </div>
        )}

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

        {/* rosto oculto — foco na verificação (o "sem rosto" é secundário) */}
        {extra?.faceHidden && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#2a7d4f]/40 bg-[#12331f]/40 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Perfil e fotos verificados pela nossa equipe</p>
              <p className="mt-0.5 text-xs text-muted">Confirmamos a identidade da acompanhante. Ela optou por não exibir o rosto nas fotos.</p>
            </div>
          </div>
        )}

        {/* preço */}
        <div className="mt-4">
          {displayPrice > 0 ? (
            <>
              <span className="text-xs text-muted">A partir de</span>
              <div className="font-display text-3xl font-extrabold text-accent">{formatBRL(displayPrice)}</div>
            </>
          ) : (
            <div className="font-display text-2xl font-extrabold text-accent">Cachê a combinar</div>
          )}
        </div>

        {(showWhats || showTelegram || showCall) && (
          <div className="mt-5 flex flex-col gap-2.5">
            {showWhats && (
              <TrackedContactLink adId={ad.id} href={waHref!} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-pill bg-wa px-5 py-3.5 text-base font-semibold text-white shadow-pop transition-all hover:bg-wa-strong active:scale-[0.99]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.15-1.7-.83-2-.93-.26-.1-.45-.15-.65.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.29-.02-.45.13-.6.13-.13.29-.33.44-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.65-1.57-.9-2.15-.24-.56-.48-.48-.65-.49h-.56c-.19 0-.5.07-.77.36s-1.01.99-1.01 2.41 1.04 2.8 1.18 2.99c.15.19 2.05 3.13 4.96 4.39.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.7-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.56-.34z" /><path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.05-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3 .78.8-2.92-.2-.31A8.2 8.2 0 1 1 12 20.2z" /></svg>
                Chamar no WhatsApp
              </TrackedContactLink>
            )}
            {showTelegram && (
              <TrackedContactLink adId={ad.id} href={tgHref!} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-pill bg-[#229ED9] px-5 py-3.5 text-base font-semibold text-white shadow-pop transition-all hover:brightness-110 active:scale-[0.99]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3l-3.3 15.6c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.14 9.36-8.46c.4-.36-.09-.56-.63-.2L5.7 13.06 0.72 11.5c-1.08-.34-1.1-1.08.23-1.6L20.5 2.7c.9-.34 1.69.2 1.4 1.6z" /></svg>
                Chamar no Telegram
              </TrackedContactLink>
            )}
            {showCall && (
              <TrackedContactLink adId={ad.id} href={telHref!} className="flex w-full items-center justify-center gap-2 rounded-pill bg-ink px-5 py-3.5 text-base font-semibold text-canvas shadow-pop transition-all hover:opacity-90 active:scale-[0.99]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.27-.27.68-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.6 21 3 13.4 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.46.57 3.58.11.34.03.75-.24 1.02l-2.23 2.2z" fill="currentColor" /></svg>
                Ligar agora
              </TrackedContactLink>
            )}
          </div>
        )}

        {/* áudio de voz */}
        {extra?.audioUrl && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1d5fa5]/15 text-[#4a9be8]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-semibold text-ink">Ouça a voz</p>
              <audio controls preload="none" controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} src={extra.audioUrl} className="w-full" />
            </div>
          </div>
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
            <h2 className="mb-3 font-display text-lg font-bold text-ink">{VIDEO_ENABLED ? "Fotos e vídeos" : "Fotos"}</h2>
            <Gallery items={media} />
          </section>
        )}
      </div>
    </main>
  );
}
