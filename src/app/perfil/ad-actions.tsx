import Link from "next/link";
import PendingLink from "@/components/PendingLink";
import BumpButton from "@/components/BumpButton";
import AvailabilityButton from "@/components/AvailabilityButton";
import StatusButton from "@/components/StatusButton";

type Ad = { id: string; is_available: boolean; bumped_at: string | null; status: string };

// No Grátis os botões aparecem normais, mas levam pra tela exclusiva de planos.
function BumpUpsell() {
  return (
    <Link href="/meu-anuncio/planos" className="flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V8m0 0l-5 5m5-5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Subir pro topo
    </Link>
  );
}
function AvailabilityUpsell() {
  return (
    <Link href="/meu-anuncio/planos" className="flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-bold text-ink transition-all hover:bg-accent-soft active:scale-[0.98]">
      <span className="h-2 w-2 rounded-full bg-available" />
      Marcar como disponível agora
    </Link>
  );
}

export default function AdActions({ ad, editHref = "/meu-anuncio?step=1", cooldownMinutes = 60, canBump = true, canAvailability = true }: { ad: Ad; editHref?: string; cooldownMinutes?: number; canBump?: boolean; canAvailability?: boolean }) {
  const paused = ad.status !== "active";

  return (
    <div className="space-y-3">
      {/* editar */}
      <PendingLink
        href={editHref}
        className="flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Editar anúncio
      </PendingLink>

      {!paused && (
        <>
          {/* subir pro topo */}
          {canBump ? <BumpButton cooldownMinutes={cooldownMinutes} bumpedAt={ad.bumped_at} /> : <BumpUpsell />}

          {/* disponível agora */}
          {canAvailability ? <AvailabilityButton initialAvailable={ad.is_available} /> : <AvailabilityUpsell />}
        </>
      )}

      {/* pausar / reativar */}
      <StatusButton initialPaused={paused} />
    </div>
  );
}
