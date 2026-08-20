"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type City = { id: number; name: string; uf: string };

export default function SearchBox({ defaultQuery = "" }: { defaultQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultQuery);
  const [cities, setCities] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // busca cidades (debounce) conforme digita
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setCities([]); setLoading(false); return; }
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/cities?q=${encodeURIComponent(q)}`);
        const j = await res.json();
        setCities(j.cities ?? []);
      } catch { setCities([]); }
      setLoading(false);
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value]);

  // fecha ao clicar fora
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pickCity(c: City) {
    setOpen(false);
    setValue(`${c.name} - ${c.uf}`);
    router.push(`/?city_id=${c.id}`);
  }
  function submitText() {
    const q = value.trim();
    setOpen(false);
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open || cities.length === 0) {
      if (e.key === "Enter") { e.preventDefault(); submitText(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => Math.min(i + 1, cities.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hi >= 0 && cities[hi]) pickCity(cities[hi]); else submitText(); }
  }

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative order-3 w-full min-w-0 sm:order-none sm:w-56 md:w-72">
      <div className="group flex items-center gap-2.5 rounded-full border border-line bg-surface-2/70 px-4 py-2.5 transition-colors duration-200 focus-within:border-ink/25 focus-within:bg-surface-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setHi(-1); }}
          onFocus={() => { if (cities.length) setOpen(true); }}
          onKeyDown={onKey}
          placeholder="Buscar cidade…"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="searchbox-input w-full bg-transparent text-sm text-ink placeholder:text-muted/70 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(""); setCities([]); setOpen(false); }}
            aria-label="Limpar"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          {loading && cities.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Buscando…</p>
          ) : cities.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Nenhuma cidade encontrada.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {cities.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHi(i)}
                    onClick={() => pickCity(c)}
                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors ${i === hi ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-2"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-accent" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="11" r="2.2" fill="currentColor" /></svg>
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">{c.uf}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
