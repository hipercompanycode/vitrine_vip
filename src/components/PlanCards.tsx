import Link from "next/link";
import { PLANS, type Plan } from "@/lib/plans";
import { VIDEO_ENABLED } from "@/lib/media";

const HIGHLIGHT = "premium"; // mais vantajoso

const TAGLINE: Record<string, string> = {
  free: "Sempre grátis",
  pro: "Pra começar",
  premium: "Máximo destaque",
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Feat({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {ok ? (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#12331f]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-[#43d17f]" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      ) : (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-muted/50" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </span>
      )}
      <span className={ok ? "text-ink" : "text-muted/50"}>{children}</span>
    </li>
  );
}

function bumpLabel(p: Plan) {
  if (!p.allowsBump) return "Subir ao topo";
  const m = p.bumpCooldownMinutes;
  if (m === 0) return "Subir ao topo a qualquer hora";
  const cada = m % 60 === 0 ? `${m / 60}h` : `${m} min`;
  return `Subir ao topo a cada ${cada}`;
}

export default function PlanCards({ currentSlug }: { currentSlug?: string }) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {PLANS.map((p) => {
        const top = p.slug === HIGHLIGHT;
        const isFree = p.slug === "free";
        const isCurrent = p.slug === currentSlug;
        return (
          <div
            key={p.slug}
            className={`relative flex min-h-[480px] flex-col rounded-2xl border p-7 ${
              top
                ? "border-accent/70 bg-gradient-to-b from-accent-soft/35 to-surface ring-1 ring-accent/25 shadow-[0_10px_50px_-24px_var(--accent)]"
                : isFree
                  ? "border-line/70 bg-surface/60 shadow-card"
                  : "border-line bg-surface shadow-card"
            }`}
          >
            {top && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-pop">
                ★ Mais vantajoso
              </span>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{TAGLINE[p.slug]}</p>
              <h3 className={`mt-1 font-display text-2xl font-extrabold ${top ? "text-accent" : "text-ink"}`}>{p.name}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-[2.75rem] font-extrabold leading-none text-ink">{isFree ? "R$ 0" : brl(p.priceCents)}</span>
                <span className="pb-1 text-sm font-medium text-muted">{isFree ? "/vitalício" : "/mês"}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{isFree ? "Grátis para sempre, sem cartão." : "Pix — vale 30 dias (renovação manual)."}</p>
            </div>

            <div className="my-6 h-px w-full bg-line/70" />

            <ul className="flex-1 space-y-3.5">
              <Feat ok>{p.maxPhotos} fotos no anúncio</Feat>
              {VIDEO_ENABLED && <Feat ok={p.maxVideos > 0}>{p.maxVideos > 0 ? `${p.maxVideos} vídeo${p.maxVideos > 1 ? "s" : ""}` : "Vídeos no anúncio"}</Feat>}
              <Feat ok={p.allowsStory}>Story 24h na capa</Feat>
              <Feat ok={p.allowsAudio}>Áudio de apresentação</Feat>
              <Feat ok={p.allowsAvailability}>Marcar &quot;disponível agora&quot;</Feat>
              <Feat ok={p.allowsBump}>{bumpLabel(p)}</Feat>
              <Feat ok={p.topSeal}>Selo de destaque (TOP)</Feat>
            </ul>

            {isCurrent ? (
              <span className="mt-7 flex items-center justify-center gap-2 rounded-input border border-line bg-surface-2 py-3.5 text-center text-sm font-bold text-ink ring-1 ring-[#43d17f]/15">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                Seu plano atual
              </span>
            ) : isFree ? (
              <span className="mt-7 block rounded-input border border-dashed border-line py-3.5 text-center text-sm font-semibold text-muted">
                Plano base (incluído)
              </span>
            ) : (
              <Link
                href={`/assinar/${p.slug}`}
                className={`mt-7 block rounded-input py-3.5 text-center text-sm font-bold transition-all active:scale-[0.98] ${
                  top ? "bg-accent text-white hover:bg-accent-strong" : "border border-line bg-surface-2 text-ink hover:border-accent hover:text-accent"
                }`}
              >
                Assinar {p.name}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
