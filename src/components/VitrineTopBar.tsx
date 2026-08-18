"use client";
import { useState } from "react";
import Link from "next/link";
import FilterDrawer from "./FilterDrawer";

export default function VitrineTopBar({
  cityLabel,
  defaultQuery = "",
}: {
  cityLabel?: string;
  defaultQuery?: string;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 sm:py-3">
          {/* marca */}
          <Link href="/" className="group inline-flex shrink-0 items-baseline gap-0.5">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine</span>
            <span className="h-2 w-2 translate-y-[-1px] rounded-full bg-accent transition-transform group-hover:scale-125" />
          </Link>

          {/* busca (largura reduzida) */}
          <form action="/" method="get" className="order-3 w-full min-w-0 sm:order-none sm:w-56 md:w-72">
            <div className="flex items-center gap-2 rounded-pill border border-line bg-surface-2 px-3.5 py-2 transition-colors focus-within:border-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                defaultValue={defaultQuery}
                placeholder="Buscar por nome, cidade…"
                className="w-full bg-transparent text-sm text-ink placeholder:text-muted/70 focus:outline-none"
                autoComplete="off"
              />
            </div>
          </form>

          {/* empurra o grupo da direita */}
          <div className="hidden flex-1 sm:block" aria-hidden="true" />

          {/* cidade */}
          <Link
            href="/"
            className="hidden shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-accent/60 md:inline-flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true">
              <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="11" r="2.2" fill="currentColor" />
            </svg>
            <span className="max-w-[9rem] truncate">{cityLabel ?? "Todas as cidades"}</span>
          </Link>

          {/* filtros */}
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Filtros
          </button>

          {/* anunciar */}
          <Link
            href="/perfil"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_var(--accent)] transition-all hover:bg-accent-strong active:scale-95"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Anunciar</span>
          </Link>
        </div>
      </header>

      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </>
  );
}
