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
  return (
    <form action="/api/ads" method="post" className="space-y-4">
      <label className="block">
        <span className={labelCls}>Nome do serviço</span>
        <input
          name="title"
          defaultValue={ad?.title ?? ""}
          placeholder="Ex: Eletricista 24h"
          className={inputCls}
          required
        />
      </label>

      <label className="block">
        <span className={labelCls}>Idade</span>
        <input
          name="age"
          type="number"
          min={18}
          max={99}
          defaultValue={ad?.age ?? ""}
          placeholder="ex: 25"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Descrição</span>
        <textarea
          name="description"
          defaultValue={ad?.description ?? ""}
          placeholder="Conte o que você faz, diferenciais, região de atendimento…"
          className={`${inputCls} resize-none`}
          rows={4}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Preço (R$)</span>
          <input
            name="price"
            defaultValue={ad ? (ad.price_cents / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="150,00"
            inputMode="decimal"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Cidade</span>
          <CitySelect cities={cities} defaultValue={ad?.city_id ?? null} />
        </label>
      </div>

      <div>
        <span className={labelCls}>Características e serviços (aparecem nos filtros)</span>
        <div className="mt-1 space-y-3 rounded-card border border-line bg-surface-2/40 p-3">
          {ATTRIBUTE_GROUPS.map((g, gi) => (
            <div key={gi}>
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                {g.title}{g.label ? ` · ${g.label}` : ""}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((it) => (
                  <label key={it.slug} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="attr"
                      value={it.slug}
                      defaultChecked={ad?.attributes?.includes(it.slug) ?? false}
                      className="peer sr-only"
                    />
                    <span className="inline-block rounded-pill border border-line bg-surface px-2.5 py-1 text-xs text-muted transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                      {it.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className={btnPrimary}>{ad ? "Salvar alterações" : "Publicar anúncio"}</button>
    </form>
  );
}
