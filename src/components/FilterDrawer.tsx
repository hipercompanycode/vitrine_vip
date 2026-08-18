"use client";
import { useState } from "react";

/* Config das categorias (vocabulário do nicho — só rótulos de filtro). */
const CHIP_GROUPS: { title: string; accent?: boolean; groups: { label?: string; chips: string[] }[] }[] = [
  {
    title: "Principais",
    groups: [
      { label: "Pagamento", chips: ["Cartão crédito", "PIX", "De luxo", "Econômicas"] },
      { label: "Idade", chips: ["Maduras", "Ninfetas"] },
      { label: "Atendimento a", chips: ["Homens", "Mulheres", "Casais", "Deficientes físicos"] },
      { label: "Contato", chips: ["Ligação", "WhatsApp", "Telegram"] },
    ],
  },
  {
    title: "Conteúdo",
    groups: [{ chips: ["Fotos verificadas", "Rosto visível", "Com vídeo", "Com áudio"] }],
  },
  {
    title: "Aparência",
    groups: [
      { label: "Etnia", chips: ["Brancas", "Latinas", "Mulatas", "Negras", "Orientais"] },
      { label: "Cabelo", chips: ["Morenas", "Loiras", "Ruivas"] },
      { label: "Estatura", chips: ["Altas", "Mignon"] },
      { label: "Corpo", chips: ["Gordinhas", "Magras"] },
      { label: "Seios", chips: ["Peitudas", "Seios naturais"] },
      { label: "Púbis", chips: ["Peludas", "Púbis depilado"] },
    ],
  },
  {
    title: "Serviços gerais",
    groups: [{ chips: ["Beijos na boca", "Ejaculação corpo", "Facial", "Fantasias", "Massagem erótica", "Namoradinha", "Oral", "PSE", "Sexo anal"] }],
  },
  {
    title: "Serviços especiais",
    groups: [{ chips: ["Fetichismo", "Sado suave", "Sado duro", "Squirting", "Strap on"] }],
  },
  {
    title: "Lugar",
    groups: [{ chips: ["A domicílio", "Com local", "Hotel", "Motel", "Despedidas", "Festas e eventos", "Jantar romântico", "Viagens"] }],
  },
];

const AGES = Array.from({ length: 43 }, (_, i) => i + 18); // 18..60
const PRICES = [50, 100, 150, 200, 300, 400, 500, 700, 1000, 1500, 2000];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-pill border px-3 py-1.5 text-[13px] font-medium transition-all active:scale-95 ${
        active
          ? "border-accent bg-accent text-white shadow-pop"
          : "border-line bg-surface-2 text-muted hover:border-accent/60 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function RangeSelect({ label, options, unit }: { label: string; options: number[]; unit?: string }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <select className="w-full rounded-input border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none">
          <option value="">Mín</option>
          {options.map((o) => (
            <option key={o} value={o}>{unit ? `${unit} ${o}` : o}</option>
          ))}
        </select>
        <span className="text-muted">–</span>
        <select className="w-full rounded-input border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none">
          <option value="">Máx</option>
          {options.map((o) => (
            <option key={o} value={o}>{unit ? `${unit} ${o}` : o}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function FilterDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(chip: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* painel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-canvas shadow-pop transition-transform duration-300 ease-out"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true">
              <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h2 className="font-display text-lg font-extrabold text-ink">Filtros</h2>
            {selected.size > 0 && (
              <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{selected.size}</span>
            )}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* corpo scrollável */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* faixas preço/idade */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RangeSelect label="Preço (R$)" options={PRICES} unit="R$" />
            <RangeSelect label="Idade" options={AGES} />
          </section>

          {CHIP_GROUPS.map((section) => (
            <section key={section.title}>
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-accent">{section.title}</h3>
              <div className="space-y-3">
                {section.groups.map((g, gi) => (
                  <div key={gi}>
                    {g.label && <span className="mb-1.5 block text-xs font-semibold text-muted">{g.label}</span>}
                    <div className="flex flex-wrap gap-2">
                      {g.chips.map((chip) => (
                        <Chip key={chip} label={chip} active={selected.has(chip)} onClick={() => toggle(chip)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* footer sticky */}
        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <button
            onClick={() => setSelected(new Set())}
            className="flex-1 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Limpar
          </button>
          <button
            onClick={onClose}
            className="flex-[2] rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            Aplicar{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </aside>
    </>
  );
}
