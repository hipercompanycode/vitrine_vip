"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
        </span>
        <h1 className="font-display text-2xl font-extrabold text-ink">Algo deu errado</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Tivemos um problema ao carregar esta página. Tente de novo.</p>
        <div className="mt-7 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 1 2.3 5.6M4 12V7m0 5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Tentar de novo
          </button>
          <a href="/" className="rounded-pill border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">Início</a>
        </div>
      </div>
    </main>
  );
}
