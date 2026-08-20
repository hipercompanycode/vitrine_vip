import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="mb-8 inline-flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>
        <p className="font-display text-6xl font-black text-accent">404</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">Página não encontrada</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">O link pode ter expirado ou o anúncio saiu do ar.</p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Voltar pra vitrine
        </Link>
      </div>
    </main>
  );
}
