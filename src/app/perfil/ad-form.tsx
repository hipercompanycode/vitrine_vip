import CitySelect from "@/components/CitySelect";
import { inputCls, labelCls, btnPrimary } from "@/components/ui";

type City = { id: number; name: string; uf: string };
type Ad = { title: string; description: string; price_cents: number; city_id: number | null } | null;

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

      <button className={btnPrimary}>{ad ? "Salvar alterações" : "Publicar anúncio"}</button>
    </form>
  );
}
