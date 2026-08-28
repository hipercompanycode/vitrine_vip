import Link from "next/link";

/** Cabeçalho fixo: wordmark + Entrar (deslogado) / Sair (logado) + CTA Meu anúncio. */
export default function SiteHeader({ loggedIn = false, hasAd = false }: { loggedIn?: boolean; hasAd?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:py-4">
        <Link href="/" className="group inline-flex shrink-0 items-baseline gap-0.5">
          <span className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            vitrine<span className="text-accent">vip</span>
          </span>
          <span className="h-2 w-2 translate-y-[-1px] rounded-full bg-accent transition-transform group-hover:scale-125" />
        </Link>

        <div className="flex-1" aria-hidden="true" />

        {/* entrar (só deslogado) */}
        {!loggedIn && (
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center rounded-pill border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Entrar
          </Link>
        )}

        {/* meu anúncio / anunciar */}
        <Link
          href="/meu-anuncio"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_var(--accent)] transition-all hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_var(--accent)] active:scale-95"
        >
          {hasAd ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5h16M4 12h16M4 19h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              Meu anúncio
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              Anunciar
            </>
          )}
        </Link>

        {/* sair (só logado) — só ícone */}
        {loggedIn && (
          <form action="/logout" method="post" className="shrink-0">
            <button
              aria-label="Sair"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 12H3m0 0l4-4m-4 4l4 4M10 5V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
