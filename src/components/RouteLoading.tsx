// Fallback instantâneo mostrado ao navegar pra uma rota (loading.tsx).
// Dá feedback visual imediato enquanto a página carrega no servidor.
export default function RouteLoading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="inline-flex items-baseline gap-0.5">
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
        <span className="h-2 w-2 rounded-full bg-accent" />
      </span>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="animate-spin text-accent">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-muted">Carregando…</p>
    </main>
  );
}
