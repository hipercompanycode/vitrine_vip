type Ad = { id: string; is_available: boolean; bumped_at: string | null };

export default function AdActions({ ad }: { ad: Ad }) {
  return (
    <div className="space-y-3">
      <form action="/api/ads/bump" method="post">
        <button className="flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-coral hover:text-coral">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Subir pro topo
        </button>
      </form>

      <form action="/api/ads/availability" method="post">
        <input type="hidden" name="is_available" value={(!ad.is_available).toString()} />
        <button
          className={`flex w-full items-center justify-center gap-2 rounded-input py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
            ad.is_available
              ? "bg-available text-white hover:opacity-90"
              : "border border-line bg-surface text-ink hover:bg-coral-soft"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${ad.is_available ? "bg-white" : "bg-available"}`}
          />
          {ad.is_available ? "Disponível agora — tocar para desligar" : "Marcar como disponível agora"}
        </button>
      </form>
    </div>
  );
}
