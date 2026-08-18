"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ATTRIBUTE_GROUPS, sanitizeAttrs } from "@/lib/attributes";

const AGES = Array.from({ length: 43 }, (_, i) => i + 18); // 18..60
const PRICES = [50, 100, 150, 200, 300, 400, 500, 700, 1000, 1500, 2000];

type City = { id: number; name: string; uf: string };

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-pill border px-3 py-1.5 text-[13px] font-medium transition-all active:scale-95 ${
        active ? "border-accent bg-accent text-white shadow-pop" : "border-line bg-surface-2 text-muted hover:border-accent/60 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

export default function FilterDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [attrs, setAttrs] = useState<Set<string>>(new Set());
  const [verified, setVerified] = useState(false);
  const [video, setVideo] = useState(false);
  const [pmin, setPmin] = useState("");
  const [pmax, setPmax] = useState("");
  const [imin, setImin] = useState("");
  const [imax, setImax] = useState("");
  const [nearby, setNearby] = useState(true);
  const [city, setCity] = useState<City | null>(null);

  // geo search
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // (re)inicializa a partir da URL sempre que abrir
  useEffect(() => {
    if (!open) return;
    setAttrs(new Set(sanitizeAttrs((searchParams.get("attrs") ?? "").split(",").filter(Boolean))));
    setVerified(searchParams.get("verified") === "1");
    setVideo(searchParams.get("video") === "1");
    setPmin(searchParams.get("pmin") ?? "");
    setPmax(searchParams.get("pmax") ?? "");
    setImin(searchParams.get("imin") ?? "");
    setImax(searchParams.get("imax") ?? "");
    setNearby((searchParams.get("nearby") ?? "1") !== "0");
    setCityQuery("");
    setCityResults([]);
    setGpsMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(slug: string) {
    setAttrs((prev) => {
      const n = new Set(prev);
      n.has(slug) ? n.delete(slug) : n.add(slug);
      return n;
    });
  }

  function onCityQuery(v: string) {
    setCityQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    if (v.trim().length < 2) { setCityResults([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/cities?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setCityResults((data.cities ?? []).slice(0, 8));
      } catch { setCityResults([]); }
    }, 300);
  }

  async function useGPS() {
    if (!navigator.geolocation) { setGpsMsg("GPS indisponível."); return; }
    setGpsBusy(true); setGpsMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/geo/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const data = await res.json();
          if (data.city) { setCity(data.city); setCityQuery(""); setCityResults([]); }
          else setGpsMsg("Não achei uma cidade próxima.");
        } catch { setGpsMsg("Falha ao localizar."); }
        setGpsBusy(false);
      },
      () => { setGpsMsg("Permissão de localização negada."); setGpsBusy(false); }
    );
  }

  function apply() {
    const p = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) p.set("q", q);
    if (pmin) p.set("pmin", pmin);
    if (pmax) p.set("pmax", pmax);
    if (imin) p.set("imin", imin);
    if (imax) p.set("imax", imax);
    if (verified) p.set("verified", "1");
    if (video) p.set("video", "1");
    if (attrs.size) p.set("attrs", [...attrs].join(","));
    if (city) p.set("city_id", String(city.id));
    p.set("nearby", nearby ? "1" : "0");
    router.push(`/?${p.toString()}`);
    onClose();
  }

  function clearAll() {
    setAttrs(new Set()); setVerified(false); setVideo(false);
    setPmin(""); setPmax(""); setImin(""); setImax("");
    setCity(null); setCityQuery(""); setCityResults([]); setNearby(true);
    router.push("/");
    onClose();
  }

  const count = attrs.size + (verified ? 1 : 0) + (video ? 1 : 0) + (pmin || pmax ? 1 : 0) + (imin || imax ? 1 : 0) + (city ? 1 : 0);

  // agrupa ATTRIBUTE_GROUPS por título (na ordem de aparição)
  const byTitle = useMemo(() => {
    const map = new Map<string, typeof ATTRIBUTE_GROUPS>();
    for (const g of ATTRIBUTE_GROUPS) {
      const arr = map.get(g.title) ?? [];
      arr.push(g);
      map.set(g.title, arr);
    }
    return map;
  }, []);

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />

      <aside
        role="dialog" aria-modal="true" aria-label="Filtros"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-canvas shadow-pop transition-transform duration-300 ease-out"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <h2 className="font-display text-lg font-extrabold text-ink">Filtros</h2>
            {count > 0 && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{count}</span>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* LOCALIZAÇÃO */}
          <section>
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-accent">Localização</h3>
            <div className="space-y-2">
              <div className="relative">
                <input
                  value={cityQuery}
                  onChange={(e) => onCityQuery(e.target.value)}
                  placeholder={city ? `${city.name} - ${city.uf}` : "Buscar cidade…"}
                  className="w-full rounded-input border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
                />
                {cityResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-input border border-line bg-surface shadow-pop">
                    {cityResults.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => { setCity(c); setCityQuery(""); setCityResults([]); }} className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-accent-soft hover:text-accent">
                          {c.name} - {c.uf}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {city && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                    {city.name}-{city.uf}
                    <button type="button" onClick={() => setCity(null)} aria-label="Remover cidade">✕</button>
                  </span>
                )}
                <button type="button" onClick={useGPS} disabled={gpsBusy} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="11" r="2.2" fill="currentColor" /></svg>
                  {gpsBusy ? "Localizando…" : "Usar minha localização"}
                </button>
                <Chip label="Cidades próximas (100km)" active={nearby} onClick={() => setNearby((v) => !v)} />
              </div>
              {gpsMsg && <p className="text-xs text-accent-strong">{gpsMsg}</p>}
            </div>
          </section>

          {/* PREÇO / IDADE */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Preço (R$)</span>
              <div className="flex items-center gap-2">
                <select value={pmin} onChange={(e) => setPmin(e.target.value)} className="w-full rounded-input border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none">
                  <option value="">Mín</option>{PRICES.map((o) => <option key={o} value={o}>R$ {o}</option>)}
                </select>
                <span className="text-muted">–</span>
                <select value={pmax} onChange={(e) => setPmax(e.target.value)} className="w-full rounded-input border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none">
                  <option value="">Máx</option>{PRICES.map((o) => <option key={o} value={o}>R$ {o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Idade</span>
              <div className="flex items-center gap-2">
                <select value={imin} onChange={(e) => setImin(e.target.value)} className="w-full rounded-input border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none">
                  <option value="">Mín</option>{AGES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="text-muted">–</span>
                <select value={imax} onChange={(e) => setImax(e.target.value)} className="w-full rounded-input border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none">
                  <option value="">Máx</option>{AGES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* CONTEÚDO (verified/video especiais + chips) */}
          <section>
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-accent">Conteúdo</h3>
            <div className="flex flex-wrap gap-2">
              <Chip label="Fotos verificadas" active={verified} onClick={() => setVerified((v) => !v)} />
              <Chip label="Com vídeo" active={video} onClick={() => setVideo((v) => !v)} />
              {(byTitle.get("Conteúdo") ?? []).flatMap((g) => g.items).map((it) => (
                <Chip key={it.slug} label={it.label} active={attrs.has(it.slug)} onClick={() => toggle(it.slug)} />
              ))}
            </div>
          </section>

          {/* demais grupos de atributos */}
          {[...byTitle.keys()].filter((t) => t !== "Conteúdo").map((title) => (
            <section key={title}>
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-accent">{title}</h3>
              <div className="space-y-3">
                {(byTitle.get(title) ?? []).map((g, gi) => (
                  <div key={gi}>
                    {g.label && <span className="mb-1.5 block text-xs font-semibold text-muted">{g.label}</span>}
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((it) => (
                        <Chip key={it.slug} label={it.label} active={attrs.has(it.slug)} onClick={() => toggle(it.slug)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <button onClick={clearAll} className="flex-1 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2">Limpar</button>
          <button onClick={apply} className="flex-[2] rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">Aplicar{count > 0 ? ` (${count})` : ""}</button>
        </div>
      </aside>
    </>
  );
}
