import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdult } from "@/lib/age";
import MetricsChart from "@/components/MetricsChart";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Métricas", robots: { index: false, follow: false } };

const DAYS = 14;
const HOUR = 3_600_000, DAY = 24 * HOUR;
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// desloca pro fuso de Brasília (UTC-3) antes de agrupar por dia/hora
const brt = (t: string) => new Date(new Date(t).getTime() - 3 * HOUR);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function Stat({ label, value, sub, tone = "ink" }: { label: string; value: string | number; sub?: React.ReactNode; tone?: "ink" | "accent" | "blue" }) {
  const c = tone === "accent" ? "text-accent" : tone === "blue" ? "text-[#4a9be8]" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 font-display text-2xl font-extrabold ${c}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted">sem base ainda</span>;
  const up = pct >= 0;
  return (
    <span className={up ? "text-[#43d17f]" : "text-red-400"}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(pct))}% vs. 7 dias anteriores
    </span>
  );
}

export default async function MetricasPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/metricas");

  const admin = createAdminClient();
  const [{ data: ad }, { data: prof }] = await Promise.all([
    admin.from("ads").select("id, title, views, contact_clicks, bump_count, bumped_at, is_available, created_at, price_cents, price_table, description, headline, audio_path").eq("profile_id", user.id).maybeSingle(),
    admin.from("profiles").select("birthdate").eq("id", user.id).maybeSingle(),
  ]);
  if (!ad) redirect("/meu-anuncio");
  if (!isAdult((prof?.birthdate as string | null) ?? null)) redirect("/meu-anuncio");

  const nowIso = new Date().toISOString();
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [{ data: events }, { count: likes }, { count: favs }, { count: reviews }, { data: media }, { data: story }] = await Promise.all([
    admin.from("ad_events").select("kind, created_at").eq("ad_id", ad.id).gte("created_at", since),
    admin.from("likes").select("id", { count: "exact", head: true }).eq("ad_id", ad.id),
    admin.from("favorites").select("id", { count: "exact", head: true }).eq("ad_id", ad.id),
    admin.from("reviews").select("id", { count: "exact", head: true }).eq("ad_id", ad.id).eq("status", "publicada"),
    admin.from("ad_media").select("type").eq("ad_id", ad.id),
    admin.from("stories").select("id").eq("ad_id", ad.id).gt("expires_at", nowIso).maybeSingle(),
  ]);
  const evs = (events ?? []) as { kind: string; created_at: string }[];

  // série dos últimos 14 dias
  const buckets: { key: string; d: string; v: number; c: number }[] = [];
  const now = new Date(Date.now() - 3 * HOUR);
  for (let i = DAYS - 1; i >= 0; i--) {
    const dt = new Date(now.getTime() - i * DAY);
    buckets.push({ key: dayKey(dt), d: `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`, v: 0, c: 0 });
  }
  const bi = new Map(buckets.map((b, i) => [b.key, i] as const));
  const byHour = new Array(24).fill(0);
  const byWeekday = new Array(7).fill(0);
  let v7 = 0, v7prev = 0, c7 = 0;
  const t7 = Date.now() - 7 * DAY, t14 = Date.now() - 14 * DAY;
  for (const e of evs) {
    const d = brt(e.created_at);
    const idx = bi.get(dayKey(d));
    if (idx != null) { if (e.kind === "view") buckets[idx].v++; else if (e.kind === "contact") buckets[idx].c++; }
    const ts = new Date(e.created_at).getTime();
    if (e.kind === "view") {
      byHour[d.getUTCHours()]++;
      byWeekday[d.getUTCDay()]++;
      if (ts >= t7) v7++; else if (ts >= t14) v7prev++;
    } else if (e.kind === "contact" && ts >= t7) c7++;
  }

  const totalViews = (ad.views as number | null) ?? 0;
  const totalContacts = (ad.contact_clicks as number | null) ?? 0;
  const contactRate = totalViews > 0 ? (totalContacts / totalViews) * 100 : 0;
  const trend7 = v7prev > 0 ? ((v7 - v7prev) / v7prev) * 100 : (v7 > 0 ? null : null);
  const peakHour = byHour.some((x) => x > 0) ? byHour.indexOf(Math.max(...byHour)) : null;
  const peakWeekday = byWeekday.some((x) => x > 0) ? byWeekday.indexOf(Math.max(...byWeekday)) : null;
  const bestDay = buckets.reduce((best, b) => (b.v > best.v ? b : best), { d: "—", v: -1, key: "", c: 0 });

  const dias = Math.max(1, Math.floor((Date.now() - new Date(ad.created_at as string).getTime()) / DAY));
  const nPhotos = (media ?? []).filter((m: any) => m.type === "photo").length;
  const hasPrices = ((ad.price_table as any[] | null)?.length ?? 0) > 0 || ((ad.price_cents as number) ?? 0) > 0;
  const checklist = [
    { ok: nPhotos >= 3, label: "3+ fotos", href: "/meu-anuncio/fotos" },
    { ok: !!ad.audio_path, label: "Áudio de voz", href: "/meu-anuncio/audio" },
    { ok: !!story, label: "Story ativo", href: "/meu-anuncio/story" },
    { ok: hasPrices, label: "Tabela de preços", href: "/meu-anuncio?step=2" },
    { ok: !!(ad.description as string | null)?.trim(), label: "Descrição", href: "/meu-anuncio?step=1" },
    { ok: !!ad.is_available, label: "Disponível agora", href: "/meu-anuncio" },
  ];
  const done = checklist.filter((c) => c.ok).length;
  const pct = Math.round((done / checklist.length) * 100);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Link href="/meu-anuncio" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Voltar
          </Link>
          <span className="ml-auto inline-flex items-baseline gap-0.5">
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Métricas do anúncio</h1>
          <p className="mt-1 text-sm text-muted">Desempenho de <strong className="text-ink">{(ad.title as string) || "seu anúncio"}</strong> · no ar há {dias} {dias === 1 ? "dia" : "dias"}.</p>
        </div>

        {/* cards principais */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Visualizações" value={totalViews.toLocaleString("pt-BR")} sub={<>{v7} nos últimos 7 dias</>} tone="accent" />
          <Stat label="Contatos" value={totalContacts.toLocaleString("pt-BR")} sub={<>{c7} nos últimos 7 dias</>} tone="blue" />
          <Stat label="Taxa de contato" value={`${contactRate.toFixed(1)}%`} sub="de quem vê, chama" />
          <Stat label="Subidas ao topo" value={(ad.bump_count as number | null) ?? 0} sub={ad.bumped_at ? `última: ${new Date(ad.bumped_at as string).toLocaleDateString("pt-BR")}` : "—"} />
        </div>

        {/* gráfico */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink">Últimos {DAYS} dias</h2>
            <span className="text-xs"><Trend pct={trend7} /></span>
          </div>
          <MetricsChart data={buckets.map((b) => ({ d: b.d, v: b.v, c: b.c }))} />
        </div>

        {/* insights */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-center shadow-card">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Horário de pico</div>
            <div className="mt-0.5 font-display text-xl font-extrabold text-ink">{peakHour != null ? `${String(peakHour).padStart(2, "0")}h` : "—"}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-center shadow-card">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Dia + forte</div>
            <div className="mt-0.5 font-display text-xl font-extrabold text-ink">{peakWeekday != null ? WEEKDAYS[peakWeekday] : "—"}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-center shadow-card">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Melhor dia</div>
            <div className="mt-0.5 font-display text-xl font-extrabold text-ink">{bestDay.v > 0 ? bestDay.d : "—"}</div>
          </div>
        </div>

        {/* engajamento */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Curtidas" value={likes ?? 0} />
          <Stat label="Favoritos" value={favs ?? 0} />
          <Stat label="Avaliações" value={reviews ?? 0} />
        </div>

        {/* completude do perfil */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink">Força do seu perfil</h2>
            <span className={`font-display text-lg font-extrabold ${pct >= 80 ? "text-[#43d17f]" : "text-accent"}`}>{pct}%</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full ${pct >= 80 ? "bg-[#43d17f]" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className={`flex items-center gap-2 rounded-input px-2.5 py-2 text-sm transition-colors ${c.ok ? "text-muted" : "text-ink hover:bg-surface-2"}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-[#12331f] text-[#43d17f]" : "border border-line text-muted"}`}>
                    {c.ok ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>}
                  </span>
                  <span className={c.ok ? "line-through decoration-line" : "font-medium"}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">Perfis completos aparecem melhor e recebem mais contato.</p>
        </div>

        <p className="text-center text-[11px] text-muted">As métricas por dia começaram a ser registradas agora — enchem com o tempo.</p>
      </main>
    </>
  );
}
