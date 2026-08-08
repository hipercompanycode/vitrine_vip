type City = { id: number; name: string; uf: string };

export default function CitySelect({
  cities, defaultValue, name = "city_id",
}: { cities: City[]; defaultValue?: number | null; name?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="w-full border rounded p-2">
      <option value="">Selecione a cidade</option>
      {cities.map((c) => (
        <option key={c.id} value={c.id}>{c.name} - {c.uf}</option>
      ))}
    </select>
  );
}
