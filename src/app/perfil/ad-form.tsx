import CitySelect from "@/components/CitySelect";

type City = { id: number; name: string; uf: string };
type Ad = { title: string; description: string; price_cents: number; city_id: number | null } | null;

export default function AdForm({ ad, cities }: { ad: Ad; cities: City[] }) {
  return (
    <form action="/api/ads" method="post" className="space-y-3">
      <input name="title" defaultValue={ad?.title ?? ""} placeholder="Nome do serviço"
        className="w-full border rounded p-2" required />
      <textarea name="description" defaultValue={ad?.description ?? ""} placeholder="Descrição"
        className="w-full border rounded p-2" rows={4} />
      <input name="price" defaultValue={ad ? (ad.price_cents / 100).toFixed(2).replace(".", ",") : ""}
        placeholder="Preço (ex: 150,00)" className="w-full border rounded p-2" />
      <CitySelect cities={cities} defaultValue={ad?.city_id ?? null} />
      <button className="bg-black text-white rounded p-2 w-full">Salvar anúncio</button>
    </form>
  );
}
