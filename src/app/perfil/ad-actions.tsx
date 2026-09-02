import Link from "next/link";
import PendingLink from "@/components/PendingLink";
import BumpButton from "@/components/BumpButton";
import AvailabilityButton from "@/components/AvailabilityButton";
import StatusButton from "@/components/StatusButton";

type Ad = { id: string; is_available: boolean; bumped_at: string | null; status: string };

// Botão "travado" (recurso pago): leva pra tela de planos.
function LockedAction({ label }: { label: string }) {
  return (
    <Link
      href="/meu-anuncio?step=5"
      className="flex w-full items-center justify-center gap-2 rounded-input border border-dashed border-line bg-surface/50 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      {label}
      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">Pro</span>
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
          {canBump ? <BumpButton cooldownMinutes={cooldownMinutes} bumpedAt={ad.bumped_at} /> : <LockedAction label="Subir ao topo" />}

          {/* disponível agora */}
          {canAvailability ? <AvailabilityButton initialAvailable={ad.is_available} /> : <LockedAction label="Disponível agora" />}
        </>
      )}

      {/* pausar / reativar */}
      <StatusButton initialPaused={paused} />
    </div>
  );
}
