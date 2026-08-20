"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ATTRIBUTE_GROUPS, labelOf, sanitizeAttrs } from "@/lib/attributes";
import { VIDEO_ENABLED } from "@/lib/media";

const PRICE_MIN = 0, PRICE_MAX = 2000, PRICE_STEP = 50;
const AGE_MIN = 18, AGE_MAX = 60;

type City = { id: number; name: string; uf: string };

const THUMB =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-accent";

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`rounded-pill border px-3 py-1.5 text-[13px] font-medium transition-all active:scale-95 ${active ? "border-accent bg-accent text-white shadow-pop" : "border-line bg-surface-2 text-muted hover:border-accent/60 hover:text-ink"}`}>
      {label}
    </button>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded-input border px-3 py-2.5 text-sm font-medium transition-colors ${on ? "border-accent/60 bg-accent-soft text-ink" : "border-line bg-surface-2 text-muted"}`}>
      <span>{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[1.15rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function DualRange({ min, max, step, lo, hi, onLo, onHi, fmt }: {
  min: number; max: number; step: number; lo: number; hi: number;
  onLo: (v: number) => void; onHi: (v: number) => void; fmt: (v: number) => string;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-ink">
        <span>{fmt(lo)}</span>
        <span>{hi >= max ? `${fmt(max)}+` : fmt(hi)}</span>
      </div>
      <div className="relative h-6">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-surface-2" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => onLo(Math.min(Number(e.target.value), hi - step))}
          className={`pointer-events-none absolute inset-0 z-20 h-6 w-full appearance-none bg-transparent ${THUMB}`} />
        <input type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => onHi(Math.max(Number(e.target.value), lo + step))}
          className={`pointer-events-none absolute inset-0 z-10 h-6 w-full appearance-none bg-transparent ${THUMB}`} />
      </div>
    </div>
  );
}

function Section({ title, count, open, onToggle, children }: {
  title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line/70 py-4 last:border-0">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-ink">{title}</span>
          {count > 0 && <span className="rounded-pill bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

export default function FilterDrawer({ open, onClose, cityLabel }: { open: boolean; onClose: () => void; cityLabel?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [attrs, setAttrs] = useState<Set<string>>(new Set());
  const [video, setVideo] = useState(false);
  const [plo, setPlo] = useState(PRICE_MIN);
  const [phi, setPhi] = useState(PRICE_MAX);
  const [alo, setAlo] = useState(AGE_MIN);
  const [ahi, setAhi] = useState(AGE_MAX);
  const [city, setCity] = useState<City | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [openSecs, setOpenSecs] = useState<Set<string>>(new Set(["Localização", "Faixas", "Conteúdo"]));
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countDeb = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setAttrs(new Set(sanitizeAttrs((searchParams.get("attrs") ?? "").split(",").filter(Boolean))));
    setVideo(searchParams.get("video") === "1");
    setPlo(Number(searchParams.get("pmin") ?? PRICE_MIN));
    setPhi(Number(searchParams.get("pmax") ?? PRICE_MAX));
    setAlo(Number(searchParams.get("imin") ?? AGE_MIN));
    setAhi(Number(searchParams.get("imax") ?? AGE_MAX));
    const cid = searchParams.get("city_id");
    if (cid && cityLabel) {
      const [nm, uf] = cityLabel.split(" - ");
      setCity({ id: Number(cid), name: nm ?? "Cidade", uf: uf ?? "" });
    } else setCity(null);
    setCityQuery(""); setCityResults([]); setGpsMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const buildParams = useCallback((): URLSearchParams => {
    const p = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) p.set("q", q);
    if (plo > PRICE_MIN) p.set("pmin", String(plo));
    if (phi < PRICE_MAX) p.set("pmax", String(phi));
    if (alo > AGE_MIN) p.set("imin", String(alo));
    if (ahi < AGE_MAX) p.set("imax", String(ahi));
    if (video) p.set("video", "1");
    if (attrs.size) p.set("attrs", [...attrs].join(","));
    if (city) p.set("city_id", String(city.id));
    return p;
  }, [searchParams, plo, phi, alo, ahi, video, attrs, city]);

  // contagem ao vivo
  const paramsKey = buildParams().toString();
  useEffect(() => {
    if (!open) return;
    if (countDeb.current) clearTimeout(countDeb.current);
    countDeb.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vitrine/count?${paramsKey}`);
        const data = await res.json();
        setCount(typeof data.count === "number" ? data.count : null);
      } catch { setCount(null); }
    }, 250);
    return () => { if (countDeb.current) clearTimeout(countDeb.current); };
  }, [paramsKey, open]);

  function toggleAttr(slug: string) {
    setAttrs((prev) => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  }
  function toggleSec(t: string) {
    setOpenSecs((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
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

  const byTitle = useMemo(() => {
    const m = new Map<string, typeof ATTRIBUTE_GROUPS>();
    for (const g of ATTRIBUTE_GROUPS) { const a = m.get(g.title) ?? []; a.push(g); m.set(g.title, a); }
    return m;
  }, []);

  const priceChanged = plo > PRICE_MIN || phi < PRICE_MAX;
  const ageChanged = alo > AGE_MIN || ahi < AGE_MAX;
  const attrsInTitle = (t: string) => (byTitle.get(t) ?? []).flatMap((g) => g.items).filter((it) => attrs.has(it.slug)).length;
  const total = attrs.size + (video ? 1 : 0) + (priceChanged ? 1 : 0) + (ageChanged ? 1 : 0) + (city ? 1 : 0);

  // chips de aplicados
  const applied: { key: string; label: string; remove: () => void }[] = [];
  if (city) applied.push({ key: "city", label: `${city.name}-${city.uf}`, remove: () => setCity(null) });
  if (priceChanged) applied.push({ key: "price", label: `R$ ${plo}–${phi >= PRICE_MAX ? PRICE_MAX + "+" : phi}`, remove: () => { setPlo(PRICE_MIN); setPhi(PRICE_MAX); } });
  if (ageChanged) applied.push({ key: "age", label: `${alo}–${ahi >= AGE_MAX ? AGE_MAX + "+" : ahi} anos`, remove: () => { setAlo(AGE_MIN); setAhi(AGE_MAX); } });
  if (video) applied.push({ key: "video", label: "Com vídeo", remove: () => setVideo(false) });
  for (const slug of attrs) applied.push({ key: slug, label: labelOf(slug), remove: () => toggleAttr(slug) });

  function apply() { router.push(`/?${buildParams().toString()}`); onClose(); }
  function clearAll() {
    setAttrs(new Set()); setVideo(false);
    setPlo(PRICE_MIN); setPhi(PRICE_MAX); setAlo(AGE_MIN); setAhi(AGE_MAX);
    setCity(null); setCityQuery(""); setCityResults([]);
    router.push("/"); onClose();
  }

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />

      <aside role="dialog" aria-modal="true" aria-label="Filtros"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-canvas shadow-pop transition-transform duration-300 ease-out">

        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <h2 className="font-display text-lg font-extrabold text-ink">Filtros</h2>
            {total > 0 && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{total}</span>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* chips de aplicados */}
        {applied.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-line bg-surface/40 px-5 py-3">
            {applied.map((a) => (
              <button key={a.key} type="button" onClick={a.remove} className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-white">
                {a.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </button>
            ))}
            <button type="button" onClick={() => { setAttrs(new Set()); setVideo(false); setPlo(PRICE_MIN); setPhi(PRICE_MAX); setAlo(AGE_MIN); setAhi(AGE_MAX); setCity(null); }} className="ml-auto text-xs font-semibold text-muted hover:text-accent">Limpar tudo</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5">
          {/* Localização */}
          <Section title="Localização" count={city ? 1 : 0} open={openSecs.has("Localização")} onToggle={() => toggleSec("Localização")}>
            <div className="space-y-2">
              <div className="relative">
                <input value={cityQuery} onChange={(e) => onCityQuery(e.target.value)} placeholder={city ? `${city.name} - ${city.uf}` : "Buscar cidade…"}
                  className="w-full rounded-input border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
                {cityResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-input border border-line bg-surface shadow-pop">
                    {cityResults.map((c) => (
                      <li key={c.id}><button type="button" onClick={() => { setCity(c); setCityQuery(""); setCityResults([]); }} className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-accent-soft hover:text-accent">{c.name} - {c.uf}</button></li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {city && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">{city.name}-{city.uf}<button type="button" onClick={() => setCity(null)} aria-label="Remover">✕</button></span>
                )}
                <button type="button" onClick={useGPS} disabled={gpsBusy} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="11" r="2.2" fill="currentColor" /></svg>
                  {gpsBusy ? "Localizando…" : "Usar minha localização"}
                </button>
              </div>
              {gpsMsg && <p className="text-xs text-accent-strong">{gpsMsg}</p>}
            </div>
          </Section>

          {/* Faixas */}
          <Section title="Preço e idade" count={(priceChanged ? 1 : 0) + (ageChanged ? 1 : 0)} open={openSecs.has("Faixas")} onToggle={() => toggleSec("Faixas")}>
            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-xs font-semibold text-muted">Preço</span>
                <DualRange min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} lo={plo} hi={phi} onLo={setPlo} onHi={setPhi} fmt={(v) => `R$ ${v}`} />
              </div>
              <div>
                <span className="mb-2 block text-xs font-semibold text-muted">Idade</span>
                <DualRange min={AGE_MIN} max={AGE_MAX} step={1} lo={alo} hi={ahi} onLo={setAlo} onHi={setAhi} fmt={(v) => `${v}`} />
              </div>
            </div>
          </Section>

          {/* Com vídeo — standalone (fora do accordion) */}
          {VIDEO_ENABLED && (
            <div className="border-b border-line/70 py-4">
              <Toggle label="Só perfis com vídeo" on={video} onClick={() => setVideo((v) => !v)} />
            </div>
          )}

          {/* demais grupos */}
          {[...byTitle.keys()].filter((t) => t !== "Conteúdo").map((title) => (
            <Section key={title} title={title} count={attrsInTitle(title)} open={openSecs.has(title)} onToggle={() => toggleSec(title)}>
              <div className="space-y-3">
                {(byTitle.get(title) ?? []).map((g, gi) => (
                  <div key={gi}>
                    {g.label && <span className="mb-1.5 block text-xs font-semibold text-muted">{g.label}</span>}
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((it) => <Chip key={it.slug} label={it.label} active={attrs.has(it.slug)} onClick={() => toggleAttr(it.slug)} />)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <button onClick={clearAll} className="rounded-input border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2">Limpar</button>
          <button onClick={apply} className="flex-1 rounded-input bg-accent py-3 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">
            {count === null ? "Aplicar" : `Ver ${count} resultado${count === 1 ? "" : "s"}`}
          </button>
        </div>
      </aside>
    </>
  );
}
