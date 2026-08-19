import Link from "next/link";
import { PLANS } from "@/lib/plans";

const HIGHLIGHT = "premium"; // mais vantajoso

const TAGLINE: Record<string, string> = {
  basico: "Pra começar",
  pro: "Mais recursos",
  premium: "Máximo destaque",
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Feat({ ok, children }: { ok: boolean; children: React.ReactNode }) {
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
      <span className={ok ? "text-ink" : "text-muted/60"}>{children}</span>
    </li>
  );
}

export default function PlanCards({ currentSlug }: { currentSlug?: string }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
      {PLANS.map((p) => {
        const top = p.slug === HIGHLIGHT;
        const isCurrent = p.slug === currentSlug;
        return (
          <div
            key={p.slug}
            className={`relative flex min-h-[460px] flex-col rounded-2xl border p-7 transition-transform ${
              top
                ? "border-accent bg-gradient-to-b from-accent-soft/70 via-surface to-surface shadow-lift md:-translate-y-3"
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
                <span className="font-display text-[2.75rem] font-extrabold leading-none text-ink">{brl(p.priceCents)}</span>
                <span className="pb-1 text-sm font-medium text-muted">/mês</span>
              </div>
              <p className="mt-1 text-xs text-muted">Cartão (renova sozinho) ou Pix (30 dias).</p>
            </div>

            <div className="my-6 h-px w-full bg-line/70" />

            <ul className="flex-1 space-y-3.5">
              <Feat ok>{p.maxPhotos} fotos no anúncio</Feat>
              <Feat ok>{p.maxVideos} vídeo{p.maxVideos > 1 ? "s" : ""}</Feat>
              <Feat ok={p.allowsStory}>Story 24h na capa</Feat>
              <Feat ok>{p.bumpCooldownMinutes === 0 ? "Subir ao topo a qualquer hora" : `Subir ao topo a cada ${p.bumpCooldownMinutes} min`}</Feat>
              <Feat ok={p.slug === "premium"}>Selo de destaque (TOP)</Feat>
            </ul>

            {isCurrent ? (
              <span className="mt-7 block rounded-input border border-[#1f6b3f] bg-[#0f2a1b] py-3.5 text-center text-sm font-bold text-[#7ee2a8]">Seu plano atual</span>
            ) : (
              <Link
                href={`/assinar/${p.slug}`}
                className={`mt-7 block rounded-input py-3.5 text-center text-sm font-bold transition-all active:scale-[0.98] ${
                  top ? "bg-accent text-white shadow-[0_10px_28px_-8px_var(--accent)] hover:bg-accent-strong" : "border border-line bg-surface-2 text-ink hover:border-accent hover:text-accent"
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
