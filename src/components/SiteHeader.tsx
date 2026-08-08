import Link from "next/link";

/** Cabeçalho fixo com wordmark + CTA Anunciar. */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
        <Link href="/" className="group inline-flex items-baseline gap-0.5">
          <span className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            serviços
          </span>
          <span className="h-2 w-2 translate-y-[-1px] rounded-full bg-accent transition-transform group-hover:scale-125" />
        </Link>

        <Link
          href="/perfil"
          className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_var(--accent)] transition-all hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_var(--accent)] active:scale-95"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          Anunciar
        </Link>
      </div>
    </header>
  );
}
