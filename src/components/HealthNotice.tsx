// Banner de saúde/prevenção — informativo, com link oficial do Ministério da Saúde.
// Aparece nas páginas públicas (não é anúncio; é conscientização).
export default function HealthNotice() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-8 sm:px-4">
      <a
        href="https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/i/ist"
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-start gap-3 rounded-2xl border border-line bg-surface/60 px-4 py-3 transition-colors hover:border-accent/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 21s-7-4.4-9-9.2C1.6 8 3.6 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.4 3 4 6.8-.7 1.7-1.9 3.2-3.2 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M8 12h2l1.2-2.2L13 14l1-2h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-xs leading-relaxed text-muted">
          <strong className="text-ink">Sexo seguro é coisa séria.</strong> Use camisinha e previna-se contra ISTs (antigas DSTs). Testagem, camisinha e prevenção são gratuitas no SUS.{" "}
          <span className="font-semibold text-accent">Saiba mais no Ministério da Saúde →</span>
        </span>
      </a>
    </div>
  );
}
