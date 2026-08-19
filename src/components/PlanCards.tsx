import Link from "next/link";
import { PLANS } from "@/lib/plans";

const HIGHLIGHT = "pro"; // mais vantajoso

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Feat({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-[#43d17f]" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-muted/50" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      )}
      <span className={ok ? "text-ink" : "text-muted/70"}>{children}</span>
    </li>
  );
}

export default function PlanCards({ currentSlug }: { currentSlug?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PLANS.map((p) => {
        const top = p.slug === HIGHLIGHT;
        const isCurrent = p.slug === currentSlug;
        return (
          <div key={p.slug} className={`relative flex flex-col rounded-card border p-5 shadow-card ${top ? "border-accent bg-gradient-to-b from-accent-soft/50 to-surface ring-1 ring-accent/40" : "border-line bg-surface"}`}>
            {top && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-pop">Mais vantajoso</span>
            )}
            <h3 className="font-display text-lg font-extrabold text-ink">{p.name}</h3>
            <p className="mt-1">
              <span className="font-display text-3xl font-extrabold text-accent">{brl(p.priceCents)}</span>
              <span className="text-sm font-medium text-muted">/mês</span>
            </p>

            <ul className="mt-4 flex-1 space-y-2">
              <Feat ok>{p.maxPhotos} fotos</Feat>
              <Feat ok>{p.maxVideos} vídeo{p.maxVideos > 1 ? "s" : ""}</Feat>
              <Feat ok={p.allowsStory}>Story 24h</Feat>
              <Feat ok>{p.bumpCooldownMinutes === 0 ? "Subir ao topo a qualquer hora" : `Subir ao topo a cada ${p.bumpCooldownMinutes}min`}</Feat>
              <Feat ok={p.slug === "premium"}>Selo de destaque (TOP)</Feat>
            </ul>

            {isCurrent ? (
              <span className="mt-5 block rounded-input border border-[#1f6b3f] bg-[#0f2a1b] py-2.5 text-center text-sm font-bold text-[#7ee2a8]">Seu plano atual</span>
            ) : (
              <Link href={`/assinar/${p.slug}`} className={`mt-5 block rounded-input py-2.5 text-center text-sm font-bold transition-all active:scale-[0.98] ${top ? "bg-accent text-white hover:bg-accent-strong" : "border border-line bg-surface text-ink hover:border-accent hover:text-accent"}`}>
                Assinar {p.name}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
