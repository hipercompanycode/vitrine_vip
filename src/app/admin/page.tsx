import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { reasonLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";
import AdminHeader from "@/components/AdminHeader";
import AdminStats from "@/components/AdminStats";

export const dynamic = "force-dynamic";

type Filter = "abertas" | "arquivadas" | "todas";

function Stat({ label, value, tone }: { label: string; value: number; tone: "accent" | "green" | "muted" }) {
  const color = tone === "accent" ? "text-accent" : tone === "green" ? "text-[#43d17f]" : "text-ink";
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 font-display text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const sp = await searchParams;
  const f: Filter = sp.f === "arquivadas" ? "arquivadas" : sp.f === "todas" ? "todas" : "abertas";
  const backHref = `/admin?f=${f}`;

  const admin = createAdminClient();

  const [openC, reviewedC] = await Promise.all([
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "reviewed"),
  ]);
  const openCount = openC.count ?? 0;
  const reviewedCount = reviewedC.count ?? 0;

  let query = admin
    .from("reports")
    .select("id, reason, details, status, created_at, ad_id, ads ( title, status )")
    .order("created_at", { ascending: false })
    .limit(200);
  if (f === "abertas") query = query.eq("status", "open");
  else if (f === "arquivadas") query = query.eq("status", "reviewed");
  const { data: reports } = await query;

  const now = new Date();
  const rows = (reports ?? []) as any[];

  const TABS: { key: Filter; label: string; badge?: number }[] = [
    { key: "abertas", label: "Abertas", badge: openCount },
    { key: "arquivadas", label: "Arquivadas", badge: reviewedCount },
    { key: "todas", label: "Todas" },
  ];

  const emptyMsg =
    f === "abertas" ? "Nenhuma denúncia aberta. Tudo em dia! 🎉"
    : f === "arquivadas" ? "Nenhuma denúncia arquivada ainda."
    : "Nenhuma denúncia.";

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <AdminStats />

        <nav className="mb-6 flex items-center gap-2 text-sm">
          <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Denúncias</span>
          <Link href="/admin/verificacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Verificações</Link>
        </nav>

        <h1 className="mb-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Denúncias</h1>

        {/* stats */}
        <div className="mb-5 grid max-w-2xl grid-cols-3 gap-3">
          <Stat label="Abertas" value={openCount} tone="accent" />
          <Stat label="Arquivadas" value={reviewedCount} tone="green" />
          <Stat label="Total" value={openCount + reviewedCount} tone="muted" />
        </div>

        {/* filtro por aba */}
        <div className="mb-5 inline-flex rounded-pill border border-line bg-surface p-1">
          {TABS.map((t) => {
            const active = t.key === f;
            return (
              <Link
                key={t.key}
                href={`/admin?f=${t.key}`}
                className={`inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-accent text-white" : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
                {typeof t.badge === "number" && t.badge > 0 && (
                  <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/25" : "bg-surface-2"}`}>{t.badge}</span>
                )}
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface/50 px-6 py-14 text-center text-sm text-muted">{emptyMsg}</div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {rows.map((r) => {
              const ad = Array.isArray(r.ads) ? r.ads[0] : r.ads;
              const hidden = ad?.status === "hidden";
              const isOpen = r.status === "open";
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-accent/40">
                  <div className="flex items-center gap-2">
                    <span className="rounded-pill bg-red-500/12 px-2.5 py-0.5 text-xs font-semibold text-red-300">{reasonLabel(r.reason)}</span>
                    <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${isOpen ? "bg-accent-soft text-accent" : "bg-[#12331f] text-[#43d17f]"}`}>
                      {isOpen ? "Aberta" : "Arquivada"}
                    </span>
                    <span className="ml-auto text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
                  </div>

                  <Link href={`/anuncio/${r.ad_id}`} className="mt-2.5 block font-display text-base font-bold text-ink transition-colors hover:text-accent">
                    {ad?.title ?? "(anúncio removido)"}
                  </Link>

                  {r.details && (
                    <p className="mt-1.5 border-l-2 border-line pl-3 text-sm text-muted">{r.details}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium ${hidden ? "bg-red-500/15 text-red-300" : "bg-surface-2 text-muted"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${hidden ? "bg-red-400" : "bg-[#43d17f]"}`} />
                      Anúncio {hidden ? "oculto" : "ativo"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line/60 pt-3">
                    <form action="/api/admin/hide" method="post">
                      <input type="hidden" name="ad_id" value={r.ad_id} />
                      <input type="hidden" name="status" value={hidden ? "active" : "hidden"} />
                      <input type="hidden" name="back" value={backHref} />
                      <button className={`rounded-input border px-3 py-1.5 text-sm font-semibold transition-colors ${hidden ? "border-line text-ink hover:border-accent hover:text-accent" : "border-red-500/40 text-red-300 hover:bg-red-500/10"}`}>
                        {hidden ? "Reexibir anúncio" : "Ocultar anúncio"}
                      </button>
                    </form>

                    <form action="/api/admin/report" method="post">
                      <input type="hidden" name="report_id" value={r.id} />
                      <input type="hidden" name="status" value={isOpen ? "reviewed" : "open"} />
                      <input type="hidden" name="back" value={backHref} />
                      <button className={`rounded-input px-3 py-1.5 text-sm font-semibold transition-colors ${isOpen ? "bg-accent text-white hover:bg-accent-strong" : "border border-line text-muted hover:text-ink"}`}>
                        {isOpen ? "Arquivar" : "Reabrir"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
