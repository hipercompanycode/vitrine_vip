"use client";
import { useEffect, useRef, useState } from "react";

type City = { id: number; name: string; uf: string };

// Barra de cidade: seletor por busca (debounced), GPS (navigator.geolocation) e
// toggle "cidades próximas (100km)". Props vêm do server component pai (page.tsx),
// que lê os cookies city_id/nearby e resolve o nome da cidade.
export default function HomeFilters({
  cityLabel = "Todas as cidades",
  nearby = false,
}: {
  // Opcionais (com default) só para não quebrar os call-sites que a Task 5 ainda
  // vai atualizar (page.tsx/preview). Task 5 sempre passa os dois explicitamente.
  cityLabel?: string;
  nearby?: boolean;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function search(v: string) {
    setQ(v);
    setGpsError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (v.trim().length < 2) {
      setOpts([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/cities?q=${encodeURIComponent(v)}`);
        const j = await res.json();
        setOpts(j.cities ?? []);
      } catch {
        setOpts([]);
      }
    }, 300);
  }

  async function pick(cityId: string | number) {
    setBusy(true);
    const body = new FormData();
    body.set("city_id", String(cityId));
    body.set("nearby", nearby ? "1" : "0");
    await fetch("/api/geo/select", { method: "POST", body });
    window.location.href = "/";
  }

  async function toggleNearby() {
    setBusy(true);
    const body = new FormData();
    body.set("nearby", nearby ? "0" : "1");
    body.set("keep", "1"); // não altera a cidade, só o toggle "próximas"
    await fetch("/api/geo/select", { method: "POST", body });
    window.location.href = "/";
  }

  function useGPS() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Seu navegador não suporta geolocalização.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/geo/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          if (!res.ok) {
            setGpsError("Não foi possível encontrar uma cidade perto de você.");
            setBusy(false);
            return;
          }
          window.location.href = "/";
        } catch {
          setGpsError("Falha ao buscar sua cidade. Tente novamente.");
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Escolha sua cidade manualmente."
            : "Não foi possível obter sua localização."
        );
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface/70 p-2 shadow-card backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-input px-2 text-sm text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="11" r="2.2" fill="currentColor" />
          </svg>
          <span className="font-semibold">{cityLabel}</span>
        </div>
        <div className="hidden h-6 w-px bg-line sm:block" />
        <div className="relative flex-1">
          <label htmlFor="home-city-search" className="sr-only">
            Trocar cidade
          </label>
          <input
            id="home-city-search"
            value={q}
            onChange={(e) => search(e.target.value)}
            placeholder="Trocar cidade…"
            disabled={busy}
            autoComplete="off"
            className="w-full rounded-input bg-transparent px-2 py-2 text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-60"
          />
          {opts.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-input border border-line bg-surface shadow-pop">
              {opts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c.id)}
                    disabled={busy}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent-soft disabled:opacity-60"
                  >
                    {c.name} - {c.uf}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={useGPS}
          disabled={busy}
          aria-busy={busy}
          className="rounded-input border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-accent-soft disabled:opacity-60"
        >
          {busy ? "Localizando…" : "Usar minha localização"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
        <button
          type="button"
          onClick={toggleNearby}
          disabled={busy}
          aria-pressed={nearby}
          className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
            nearby ? "bg-accent text-white" : "border border-line text-muted"
          }`}
        >
          {nearby ? "Incluindo cidades próximas (100km)" : "Só esta cidade"}
        </button>
        {gpsError && (
          <span role="status" className="text-xs text-muted">
            {gpsError}
          </span>
        )}
      </div>
    </div>
  );
}
