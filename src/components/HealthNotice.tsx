// Banner de saúde/prevenção — informativo, com link oficial do Ministério da Saúde.
// Aparece nas páginas públicas (não é anúncio; é conscientização).
export default function HealthNotice() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8">
      <a
        href="https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/i/ist"
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="group flex items-center gap-3.5 rounded-2xl border border-line/80 bg-gradient-to-br from-surface to-accent-soft/20 px-5 py-4 shadow-card ring-1 ring-inset ring-white/5 transition-all hover:border-accent/50 hover:shadow-pop sm:gap-4"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 21s-7-4.4-9-9.2C1.6 8 3.6 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.4 3 4 6.8-.7 1.7-1.9 3.2-3.2 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M8 12h2l1.2-2.2L13 14l1-2h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-[13px] leading-relaxed text-muted">
          <strong className="text-ink">Sexo seguro é coisa séria.</strong> Use camisinha e previna-se contra ISTs (antigas DSTs). Testagem, camisinha e prevenção são gratuitas no SUS.{" "}
          <span className="whitespace-nowrap font-semibold text-accent group-hover:underline">Saiba mais no Ministério da Saúde →</span>
        </span>
      </a>
    </div>
  );
}
