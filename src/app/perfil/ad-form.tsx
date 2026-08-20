import StateCityPicker from "@/components/StateCityPicker";
import PriceTable from "@/components/PriceTable";
import { inputCls, labelCls, btnPrimary } from "@/components/ui";
import { ATTRIBUTE_GROUPS } from "@/lib/attributes";

type PriceRow = { label: string; price_cents: number };
type City = { id: number; name: string; uf: string };
type Ad = {
  title: string;
  description: string;
  headline?: string | null;
  price_cents: number;
  city_id: number | null;
  age?: number | null;
  attributes?: string[] | null;
  price_table?: PriceRow[] | null;
} | null;

/** Passo 1 — dados básicos. */
export function AdBasicsForm({ ad, defaultCity, next = "/meu-anuncio", cta = "Salvar" }: { ad: Ad; defaultCity?: City | null; next?: string; cta?: string }) {
  return (
    <form action="/api/ads" method="post" className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_6.5rem]">
        <label className="block">
          <span className={labelCls}>Nome</span>
          <input name="title" defaultValue={ad?.title ?? ""} placeholder="Como você quer aparecer" className={inputCls} required />
        </label>
        <label className="block">
          <span className={labelCls}>Idade</span>
          <input name="age" type="number" min={18} max={99} defaultValue={ad?.age ?? ""} placeholder="25" className={inputCls} />
        </label>
      </div>

      <div className="block">
        <span className={labelCls}>Estado e cidade</span>
        <StateCityPicker defaultCity={defaultCity ?? null} />
      </div>

      <label className="block">
        <span className={labelCls}>Chamada do card (até 240)</span>
        <input name="headline" defaultValue={ad?.headline ?? ""} maxLength={240} placeholder="Frase curta que aparece no card" className={inputCls} />
        <span className="mt-1 block text-[11px] text-muted">É o texto curto que aparece no card da listagem.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Descrição completa</span>
        <textarea name="description" defaultValue={ad?.description ?? ""} placeholder="Texto completo — aparece na página do anúncio." className={`${inputCls} resize-none`} rows={5} />
      </label>

      <button className={btnPrimary}>{cta}</button>
    </form>
  );
}

/** Passo — tabela de preços (vários serviços/faixas). */
export function AdPricesForm({ ad, next = "/meu-anuncio", cta = "Salvar" }: { ad: Ad; next?: string; cta?: string }) {
  return (
    <form action="/api/ads" method="post" className="space-y-4">
      <input type="hidden" name="has_prices" value="1" />
      <input type="hidden" name="next" value={next} />
      <p className="text-xs text-muted">Adicione serviços e valores (ex.: 1 hora, pernoite, diária). O menor valor vira “a partir de” no card.</p>
      <PriceTable initial={ad?.price_table ?? undefined} />
      <button className={btnPrimary}>{cta}</button>
    </form>
  );
}

/** Passo 2 — características (atributos, viram filtros). */
export function AdAttributesForm({ ad, next = "/meu-anuncio", cta = "Salvar" }: { ad: Ad; next?: string; cta?: string }) {
  const selected = new Set(ad?.attributes ?? []);
  const byTitle = new Map<string, typeof ATTRIBUTE_GROUPS>();
  for (const g of ATTRIBUTE_GROUPS) {
    const a = byTitle.get(g.title) ?? [];
    a.push(g);
    byTitle.set(g.title, a);
  }

  return (
    <form action="/api/ads" method="post" className="space-y-7">
      <input type="hidden" name="has_attrs" value="1" />
      <input type="hidden" name="next" value={next} />

      {[...byTitle.entries()].map(([title, groups]) => (
        <div key={title}>
          <div className="mb-3 flex items-center gap-2 border-b border-line/60 pb-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
          </div>
          <div className="space-y-3">
            {groups.map((g, gi) => (
              <div key={gi}>
                {g.label && <span className="mb-1.5 block text-xs font-medium text-muted">{g.label}</span>}
                <div className="flex flex-wrap gap-2">
                  {g.items.map((it) => (
                    <label key={it.slug} className="cursor-pointer">
                      <input type="checkbox" name="attr" value={it.slug} defaultChecked={selected.has(it.slug)} className="peer sr-only" />
                      <span className="inline-flex items-center rounded-pill border border-line bg-surface-2 px-3.5 py-2 text-[13px] font-medium text-muted transition-all hover:border-accent/50 hover:text-ink peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-checked:shadow-pop peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                        {it.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button className={btnPrimary}>{cta}</button>
    </form>
  );
}
