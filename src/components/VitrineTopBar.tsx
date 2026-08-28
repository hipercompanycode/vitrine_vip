"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FilterDrawer from "./FilterDrawer";
import SearchBox from "./SearchBox";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function VitrineTopBar({
  cityLabel,
  defaultQuery = "",
  loggedIn = false,
  hasAd = false,
}: {
  cityLabel?: string;
  defaultQuery?: string;
  loggedIn?: boolean;
  hasAd?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Páginas de cidade são cacheadas (ISR) e não sabem o login pelo servidor —
  // então confirmamos a sessão no cliente para mostrar avatar + Sair corretamente.
  const [logged, setLogged] = useState(loggedIn);
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data }) => setLogged(!!data.session));
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:gap-x-3 sm:px-4 sm:py-3">
          {/* marca */}
          <Link href="/" className="group inline-flex shrink-0 items-baseline gap-0.5">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
            <span className="h-2 w-2 translate-y-[-1px] rounded-full bg-accent transition-transform group-hover:scale-125" />
          </Link>

          {/* busca + filtros: linha própria no mobile, inline no desktop */}
          <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto sm:flex-1">
            <SearchBox defaultQuery={defaultQuery} wrapClassName="relative min-w-0 flex-1 sm:max-w-xs" />
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent sm:py-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Filtros
            </button>
          </div>

          {/* cidade selecionada (clique = limpar) */}
          {cityLabel && (
            <Link
              href="/"
              title="Limpar cidade"
              className="hidden shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-accent/60 md:inline-flex"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true">
                <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="11" r="2.2" fill="currentColor" />
              </svg>
              <span className="max-w-[9rem] truncate">{cityLabel}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-muted" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </Link>
          )}

          {/* favoritos */}
          <Link
            href="/conta"
            aria-label="Favoritos"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent sm:ml-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20s-6.5-4.2-9-8C1.2 8.5 3 5 6.3 5 8.2 5 9.4 6.1 12 8.3 14.6 6.1 15.8 5 17.7 5 21 5 22.8 8.5 21 12c-2.5 3.8-9 8-9 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Favoritos</span>
          </Link>

          {/* entrar / avatar */}
          {logged ? (
            <Link
              href="/perfil"
              aria-label="Minha conta"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8.5" r="3.75" stroke="currentColor" strokeWidth="2" />
                <path d="M4.5 20c0-3.4 3.4-6 7.5-6s7.5 2.6 7.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center rounded-pill border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Entrar
            </Link>
          )}

          {/* sair (só logado) */}
          {logged && (
            <form action="/logout" method="post" className="shrink-0">
              <button
                aria-label="Sair"
                className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 12H3m0 0l4-4m-4 4l4 4M10 5V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          )}

          {/* anunciar / meu anúncio */}
          <Link
            href="/meu-anuncio"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_var(--accent)] transition-all hover:bg-accent-strong active:scale-95"
          >
            {hasAd ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 5h16M4 12h16M4 19h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Meu anúncio</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Anunciar</span>
              </>
            )}
          </Link>
        </div>
      </header>

      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} cityLabel={cityLabel} />
    </>
  );
}
