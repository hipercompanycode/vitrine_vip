import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { timeAgo } from "@/lib/format";
import AdminHeader from "@/components/AdminHeader";
import AdminStats from "@/components/AdminStats";
import VerificationPhotos from "@/components/VerificationPhotos";
import { maskPhone, CATEGORY_LABEL } from "@/lib/client-reports";

export const dynamic = "force-dynamic";

type Filter = "pendentes" | "aprovados" | "recusados" | "todos";

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pendente", cls: "bg-accent-soft text-accent", dot: "bg-accent" },
  approved: { label: "Publicado", cls: "bg-[#12331f] text-[#43d17f]", dot: "bg-[#43d17f]" },
  rejected: { label: "Recusado", cls: "bg-red-500/15 text-red-300", dot: "bg-red-400" },
};

export default async function AdminClientesPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const sp = await searchParams;
  const f: Filter = sp.f === "aprovados" ? "aprovados" : sp.f === "recusados" ? "recusados" : sp.f === "todos" ? "todos" : "pendentes";
  const backHref = `/admin/clientes?f=${f}`;

  const admin = createAdminClient();

  const [pC, aC, rC] = await Promise.all([
    admin.from("client_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("client_reports").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("client_reports").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);
  const pendingCount = pC.count ?? 0;
  const approvedCount = aC.count ?? 0;
  const rejectedCount = rC.count ?? 0;

  let query = admin
    .from("client_reports")
    .select("id, phone, category, description, photo_path, status, created_at, reporter_id, profiles ( name )")
    .order("created_at", { ascending: false })
    .limit(200);
  if (f === "pendentes") query = query.eq("status", "pending");
  else if (f === "aprovados") query = query.eq("status", "approved");
  else if (f === "recusados") query = query.eq("status", "rejected");
  const { data: rows } = await query;
  const list = (rows ?? []) as any[];

  const sign = async (p: string | null) => (p ? (await admin.storage.from("client-reports").createSignedUrl(p, 600)).data?.signedUrl ?? null : null);
  const signed = await Promise.all(list.map((r) => sign(r.photo_path)));

  // outros relatos aprovados do mesmo telefone (contexto pro moderador)
  const phones = Array.from(new Set(list.map((r) => r.phone)));
  const countByPhone = new Map<string, number>();
  if (phones.length) {
    const { data: agg } = await admin.from("client_reports").select("phone").eq("status", "approved").in("phone", phones);
    (agg ?? []).forEach((a: any) => countByPhone.set(a.phone, (countByPhone.get(a.phone) ?? 0) + 1));
  }

  const now = new Date();

  const TABS: { key: Filter; label: string; badge?: number }[] = [
    { key: "pendentes", label: "Pendentes", badge: pendingCount },
    { key: "aprovados", label: "Publicados", badge: approvedCount },
    { key: "recusados", label: "Recusados", badge: rejectedCount },
    { key: "todos", label: "Todos" },
  ];

  const emptyMsg =
    f === "pendentes" ? "Nenhum relato pendente. Tudo em dia! 🎉"
    : f === "aprovados" ? "Nenhum relato publicado ainda."
    : f === "recusados" ? "Nenhum relato recusado."
    : "Nenhum relato enviado.";

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <AdminStats />

        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/admin" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Denúncias</Link>
          <Link href="/admin/verificacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Verificações</Link>
          <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Clientes</span>
          <Link href="/admin/fotos" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Fotos</Link>
          <Link href="/admin/avaliacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Avaliações</Link>
        </nav>

        <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Relatos de clientes</h1>
        <p className="mb-4 max-w-2xl text-sm text-muted">Aprovar publica o relato como alerta consultável por anunciantes verificadas (sem foto e sem quem relatou). Foto e telefone completos ficam <strong className="text-ink">só aqui</strong>.</p>

        <div className="mb-5 inline-flex flex-wrap rounded-pill border border-line bg-surface p-1">
          {TABS.map((t) => {
            const active = t.key === f;
            return (
              <Link key={t.key} href={`/admin/clientes?f=${t.key}`}
                className={`inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors ${active ? "bg-accent text-white" : "text-muted hover:text-ink"}`}>
                {t.label}
                {typeof t.badge === "number" && t.badge > 0 && (
                  <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/25" : "bg-surface-2"}`}>{t.badge}</span>
                )}
              </Link>
            );
          })}
        </div>

        {list.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface/50 px-6 py-14 text-center text-sm text-muted">{emptyMsg}</div>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {list.map((r, i) => {
              const st = STATUS[r.status] ?? { label: r.status, cls: "bg-surface-2 text-muted", dot: "bg-muted" };
              const reporter = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name || "(sem nome)";
              const total = countByPhone.get(r.phone) ?? 0;
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold text-ink">{maskPhone(r.phone)}</p>
                      <p className="text-sm">
                        <span className="font-semibold text-accent">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                        {total > 1 && <span className="ml-2 rounded-pill bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-300">{total} relatos aprovados neste nº</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">Relatado por {reporter}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}
                      </span>
                      <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap rounded-input bg-surface-2/50 px-3 py-2 text-sm text-ink">{r.description}</p>

                  {signed[i] && (
                    <div className="mt-3">
                      <VerificationPhotos photos={[{ label: "Foto do cliente (só admin)", url: signed[i] }]} />
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 border-t border-line/60 pt-3">
                    <form action="/api/admin/client-report" method="post" className="flex-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="approve" />
                      <input type="hidden" name="back" value={backHref} />
                      <button disabled={r.status === "approved"}
                        className="w-full rounded-input bg-[#164a2c] py-2 text-sm font-semibold text-[#7ee2a8] transition-colors hover:bg-[#1b5c37] disabled:cursor-default disabled:opacity-50">
                        {r.status === "approved" ? "Publicado ✓" : "Aprovar (vira alerta)"}
                      </button>
                    </form>
                    <form action="/api/admin/client-report" method="post" className="flex-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="reject" />
                      <input type="hidden" name="back" value={backHref} />
                      <button disabled={r.status === "rejected"}
                        className="w-full rounded-input bg-red-500/90 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-default disabled:opacity-50">
                        {r.status === "rejected" ? "Recusado ✓" : "Recusar"}
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
