import PendingLink from "@/components/PendingLink";
import BumpButton from "@/components/BumpButton";
import AvailabilityButton from "@/components/AvailabilityButton";
import StatusButton from "@/components/StatusButton";

type Ad = { id: string; is_available: boolean; bumped_at: string | null; status: string };

export default function AdActions({ ad, editHref = "/meu-anuncio?step=1", cooldownMinutes = 60 }: { ad: Ad; editHref?: string; cooldownMinutes?: number }) {
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
          <BumpButton cooldownMinutes={cooldownMinutes} bumpedAt={ad.bumped_at} />

          {/* disponível agora */}
          <AvailabilityButton initialAvailable={ad.is_available} />
        </>
      )}

      {/* pausar / reativar */}
      <StatusButton initialPaused={paused} />
    </div>
  );
}
