import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { VIDEO_ENABLED } from "@/lib/media";
import WizardNav from "@/components/WizardNav";

const HIGHLIGHT = "premium"; // mais vantajoso

const TAGLINE: Record<string, string> = {
  pro: "Pra começar",
  premium: "Máximo destaque",
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Feat({ ok, soon, children }: { ok?: boolean; soon?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {soon ? (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2c2410]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#e0a83e]" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </span>
      ) : ok ? (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#12331f]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-[#43d17f]" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      ) : (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-muted/50" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </span>
      )}
      <span className={soon ? "text-muted" : ok ? "text-ink" : "text-muted/60"}>{children}</span>
    </li>
  );
}

// Card do teste grátis (7 dias) — mesma altura/estilo dos planos.
// CTA só avança o wizard; a assinatura de teste é criada quando o perfil é aprovado.
function TrialCard({ href }: { href: string }) {
  return (
    <div className="relative flex min-h-[460px] flex-col rounded-2xl border border-[#43d17f]/45 bg-gradient-to-b from-[#12331f]/35 to-surface p-7 shadow-card">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Experimente primeiro</p>
        <h3 className="mt-1 font-display text-2xl font-extrabold text-[#43d17f]">Teste grátis</h3>
        <div className="mt-4 flex items-end gap-1">
          <span className="font-display text-[2.75rem] font-extrabold leading-none text-ink">R$ 0</span>
          <span className="pb-1 text-sm font-medium text-muted">/7 dias</span>
        </div>
        <p className="mt-1 text-xs text-muted">Aprovado o perfil, 7 dias no ar. Sem cobrança.</p>
      </div>

      <div className="my-6 h-px w-full bg-line/70" />

      <ul className="flex-1 space-y-3.5">
        <Feat ok>Anúncio completo no ar por 7 dias</Feat>
        <Feat ok>12 fotos no anúncio</Feat>
        <Feat ok>Aparece na sua cidade</Feat>
        <Feat ok>Escolhe um plano só depois</Feat>
      </ul>

      <WizardNav
        href={href}
        label="Começar teste grátis"
        className="mt-7 w-full rounded-input bg-[#43d17f] py-3.5 text-center text-sm font-extrabold text-[#06170e] transition-all hover:bg-[#5cdb90] active:scale-[0.98]"
      />
    </div>
  );
}

export default function PlanCards({ currentSlug, trialHref }: { currentSlug?: string; trialHref?: string }) {
  const cols = trialHref ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";
  const maxW = trialHref ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className={`mx-auto grid ${maxW} grid-cols-1 items-stretch gap-6 ${cols}`}>
      {trialHref && <TrialCard href={trialHref} />}
      {PLANS.map((p) => {
        const top = p.slug === HIGHLIGHT;
        const isCurrent = p.slug === currentSlug;
        return (
          <div
            key={p.slug}
            className={`relative flex min-h-[460px] flex-col rounded-2xl border p-7 ${
              top
                ? "border-accent/70 bg-gradient-to-b from-accent-soft/35 to-surface ring-1 ring-accent/25 shadow-[0_10px_50px_-24px_var(--accent)]"
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
              <p className="mt-1 text-xs text-muted">Pix — vale 30 dias (renovação manual).</p>
            </div>

            <div className="my-6 h-px w-full bg-line/70" />

            <ul className="flex-1 space-y-3.5">
              <Feat ok>{p.maxPhotos} fotos no anúncio</Feat>
              {VIDEO_ENABLED && <Feat ok>{p.maxVideos} vídeo{p.maxVideos > 1 ? "s" : ""}</Feat>}
              <Feat soon>Story 24h na capa <span className="text-[#e0a83e]">(em breve)</span></Feat>
              <Feat ok>{p.bumpCooldownMinutes === 0 ? "Subir ao topo a qualquer hora" : `Subir ao topo a cada ${p.bumpCooldownMinutes} min`}</Feat>
              <Feat ok={p.slug === "premium"}>Selo de destaque (TOP)</Feat>
            </ul>

            {isCurrent ? (
              <span className="mt-7 flex items-center justify-center gap-2 rounded-input border border-line bg-surface-2 py-3.5 text-center text-sm font-bold text-ink ring-1 ring-[#43d17f]/15">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                Seu plano atual
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
