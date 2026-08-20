"use client";
import { useRef, useState } from "react";
import { BR_STATES } from "@/lib/states";
import { inputCls } from "./ui";

type City = { id: number; name: string; uf: string };

export default function StateCityPicker({ defaultCity, name = "city_id" }: { defaultCity?: City | null; name?: string }) {
  const [uf, setUf] = useState(defaultCity?.uf ?? "");
  const [city, setCity] = useState<City | null>(defaultCity ?? null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchCities(query: string, ufv: string) {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(async () => {
      const p = new URLSearchParams();
      if (ufv) p.set("uf", ufv);
      if (query) p.set("q", query);
      try {
        const res = await fetch(`/api/geo/cities?${p.toString()}`);
        const data = await res.json();
        setResults(data.cities ?? []);
        setOpen(true);
      } catch { setResults([]); }
    }, 220);
  }

  function onUf(v: string) {
    setUf(v); setCity(null); setQ(""); setResults([]); setOpen(false);
  }
  function onType(v: string) {
    setQ(v); setCity(null);
    if (uf) fetchCities(v, uf);
  }
  function pick(c: City) {
    setCity(c); setUf(c.uf); setQ(""); setResults([]); setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select value={uf} onChange={(e) => onUf(e.target.value)} required className={`${inputCls} appearance-none`}>
          <option value="">Estado…</option>
          {BR_STATES.map((s) => <option key={s.uf} value={s.uf}>{s.name} ({s.uf})</option>)}
        </select>
        <div className="relative">
          <input
            value={city ? `${city.name} - ${city.uf}` : q}
            onChange={(e) => onType(e.target.value)}
            onFocus={() => { if (uf && !city) fetchCities(q, uf); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={uf ? "Buscar cidade…" : "Escolha o estado antes"}
            disabled={!uf}
            required
            className={`${inputCls} disabled:opacity-50`}
            autoComplete="off"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-input border border-line bg-surface shadow-pop">
              {results.map((c) => (
                <li key={c.id}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-accent-soft hover:text-accent">
                    {c.name} - {c.uf}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <input type="hidden" name={name} value={city?.id ?? ""} />
    </div>
  );
}
