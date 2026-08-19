import CitySelect from "@/components/CitySelect";
import { inputCls, labelCls, btnPrimary } from "@/components/ui";
import { ATTRIBUTE_GROUPS } from "@/lib/attributes";

type City = { id: number; name: string; uf: string };
type Ad = {
  title: string;
  description: string;
  price_cents: number;
  city_id: number | null;
  age?: number | null;
  attributes?: string[] | null;
} | null;

/** Passo 1 — dados básicos do anúncio. */
export function AdBasicsForm({ ad, cities, next = "/meu-anuncio", cta = "Salvar" }: { ad: Ad; cities: City[]; next?: string; cta?: string }) {
  return (
    <form action="/api/ads" method="post" className="space-y-4">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Preço (R$)</span>
          <input name="price" defaultValue={ad ? (ad.price_cents / 100).toFixed(2).replace(".", ",") : ""} placeholder="150,00" inputMode="decimal" className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Cidade</span>
          <CitySelect cities={cities} defaultValue={ad?.city_id ?? null} />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Descrição</span>
        <textarea name="description" defaultValue={ad?.description ?? ""} placeholder="Fale de você, seu atendimento e região…" className={`${inputCls} resize-none`} rows={4} />
      </label>
      <button className={btnPrimary}>{cta}</button>
    </form>
  );
}

/** Passo 2 — características e serviços (atributos, viram filtros). */
export function AdAttributesForm({ ad, next = "/meu-anuncio", cta = "Salvar" }: { ad: Ad; next?: string; cta?: string }) {
  const selected = new Set(ad?.attributes ?? []);
  return (
    <form action="/api/ads" method="post" className="space-y-4">
      <input type="hidden" name="has_attrs" value="1" />
      <input type="hidden" name="next" value={next} />
      <div className="space-y-4">
        {ATTRIBUTE_GROUPS.map((g, gi) => (
          <div key={gi}>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">{g.title}{g.label ? ` · ${g.label}` : ""}</span>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((it) => (
                <label key={it.slug} className="cursor-pointer">
                  <input type="checkbox" name="attr" value={it.slug} defaultChecked={selected.has(it.slug)} className="peer sr-only" />
                  <span className="inline-block rounded-pill border border-line bg-surface-2 px-3 py-1.5 text-[13px] text-muted transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                    {it.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className={btnPrimary}>{cta}</button>
    </form>
  );
}
