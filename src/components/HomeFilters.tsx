// Barra de cidade + busca. Visual/estrutural — a geolocalização (Plano 3) e a
// busca por texto entram depois. O form usa GET "/" para já deixar o hook pronto.
export default function HomeFilters({ city = "São Paulo, SP" }: { city?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface/70 p-2 shadow-card backdrop-blur sm:flex-row sm:items-center">
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-2 rounded-input px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="11" r="2.2" fill="currentColor" />
        </svg>
        <span className="max-w-[42vw] truncate sm:max-w-none">{city}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="hidden h-6 w-px bg-line sm:block" />

      <form action="/" method="get" className="flex flex-1 items-center gap-2 rounded-input px-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          name="q"
          type="search"
          placeholder="Buscar serviço…"
          className="w-full bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </form>
    </div>
  );
}
