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

export default function AdForm({ ad, cities }: { ad: Ad; cities: City[] }) {
  const selected = new Set(ad?.attributes ?? []);
  return (
    <form action="/api/ads" method="post" className="space-y-4">
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

      {/* Características — recolhível p/ não poluir */}
      <details className="group rounded-input border border-line bg-surface-2/40">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-sm font-semibold text-ink">
          <span>Características e serviços <span className="font-normal text-muted">(aparecem nos filtros)</span></span>
          <span className="flex items-center gap-2">
            {selected.size > 0 && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{selected.size}</span>}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted transition-transform group-open:rotate-180" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </summary>
        <div className="space-y-3 border-t border-line px-3.5 py-3">
          {ATTRIBUTE_GROUPS.map((g, gi) => (
            <div key={gi}>
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">{g.title}{g.label ? ` · ${g.label}` : ""}</span>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((it) => (
                  <label key={it.slug} className="cursor-pointer">
                    <input type="checkbox" name="attr" value={it.slug} defaultChecked={selected.has(it.slug)} className="peer sr-only" />
                    <span className="inline-block rounded-pill border border-line bg-surface px-2.5 py-1 text-xs text-muted transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                      {it.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      <button className={btnPrimary}>{ad ? "Salvar alterações" : "Publicar anúncio"}</button>
    </form>
  );
}
