import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { userHasAd } from "@/lib/ads";
import { accountAccess } from "@/lib/access";
import SiteHeader from "@/components/SiteHeader";
import ClientReportForm from "@/components/ClientReportForm";
import { normalizePhone, isValidPhone, maskPhone, alertLevel, CATEGORY_LABEL } from "@/lib/client-reports";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
// Rede fechada — nunca aparece no Google.
export const metadata: Metadata = { title: "Segurança", robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, { txt: string; cls: string }> = {
  pending: { txt: "Em análise", cls: "bg-accent-soft text-accent" },
  approved: { txt: "Publicado", cls: "bg-[#12331f] text-[#43d17f]" },
  rejected: { txt: "Recusado", cls: "bg-red-500/15 text-red-300" },
};

export default async function SegurancaPage({ searchParams }: { searchParams: Promise<{ tel?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seguranca");

  const admin = createAdminClient();
  const [{ verifApproved }, hasAd] = await Promise.all([
    accountAccess(admin, user.id),
    userHasAd(admin, user.id),
  ]);

  if (!verifApproved) {
    return (
      <>
        <SiteHeader loggedIn hasAd={hasAd} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
          <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            </div>
            <h1 className="font-display text-xl font-extrabold text-ink">Rede de segurança</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              A consulta e o relato de clientes são exclusivos para <strong className="text-ink">anunciantes verificadas</strong>. Conclua sua verificação para ter acesso.
            </p>
            <Link href="/meu-anuncio?step=6" className="mt-5 inline-flex rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong">Fazer verificação</Link>
          </div>
        </main>
      </>
    );
  }

  const sp = await searchParams;
  const rawTel = (sp.tel ?? "").trim();
  const searched = rawTel && isValidPhone(rawTel) ? normalizePhone(rawTel) : null;

  // Consulta: só relatos APROVADOS, e só campos seguros (sem foto, sem quem relatou).
  let result: { level: ReturnType<typeof alertLevel>; reports: { category: string; description: string; created_at: string }[] } | null = null;
  let searchedButInvalid = !!rawTel && !searched;
  if (searched) {
    const { data } = await admin
      .from("client_reports")
      .select("category, description, created_at")
      .eq("phone", searched).eq("status", "approved")
      .order("created_at", { ascending: false });
    const reports = (data ?? []) as { category: string; description: string; created_at: string }[];
    result = { level: alertLevel(reports), reports };
  }

  // Meus relatos (do próprio anunciante) + status.
  const { data: mineRaw } = await admin
    .from("client_reports")
    .select("phone, category, status, created_at")
    .eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(30);
  const mine = (mineRaw ?? []) as { phone: string; category: string; status: string; created_at: string }[];

  const now = new Date();
  const inputCls = "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";

  return (
    <>
      <SiteHeader loggedIn hasAd={hasAd} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        <div className="py-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Segurança — clientes</h1>
          <p className="mt-1 text-sm text-muted">Consulte um número antes de atender e relate quem passou dos limites. Rede fechada entre anunciantes verificadas — <strong className="text-ink">moderada</strong>, privada e fora do Google.</p>
        </div>

        {/* Consultar */}
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-3 font-display text-base font-bold text-ink">Consultar um telefone</h2>
          <form method="get" className="flex gap-2">
            <input name="tel" defaultValue={rawTel} inputMode="tel" placeholder="(DDD) número do cliente" className={inputCls} />
            <button className="shrink-0 rounded-input bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong">Consultar</button>
          </form>

          {searchedButInvalid && <p className="mt-3 text-sm text-red-400">Telefone inválido — inclua o DDD.</p>}

          {result && (
            result.reports.length === 0 ? (
              <div className="mt-4 rounded-input border border-line bg-surface-2/50 px-4 py-3 text-sm text-muted">
                <strong className="text-ink">Nenhum alerta</strong> para {maskPhone(searched!)}. Sem relatos aprovados — mas siga com os cuidados de sempre.
              </div>
            ) : (
              <div className={`mt-4 rounded-input border px-4 py-3 ${result.level === "vermelho" ? "border-red-500/50 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
                <p className={`text-sm font-bold ${result.level === "vermelho" ? "text-red-300" : "text-amber-300"}`}>
                  {result.level === "vermelho" ? "🔴 Alerta alto" : "🟡 Atenção"} — {maskPhone(searched!)} tem {result.reports.length} relato{result.reports.length > 1 ? "s" : ""} confirmado{result.reports.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-2 space-y-2">
                  {result.reports.map((r, i) => (
                    <li key={i} className="rounded-md bg-black/20 px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                      <span className="text-xs text-muted"> · {timeAgo(new Date(r.created_at), now)}</span>
                      <p className="mt-0.5 text-muted">{r.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </section>

        {/* Relatar */}
        <section className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-1 font-display text-base font-bold text-ink">Relatar um cliente</h2>
          <p className="mb-4 text-xs text-muted">Passa pela <strong className="text-ink">moderação</strong> antes de virar alerta. Relato falso pode ser responsabilizado — você fica registrada como autora. A foto (se enviar) é vista <strong className="text-ink">só pela moderação</strong>, nunca por outras pessoas.</p>
          <ClientReportForm userId={user.id} />
        </section>

        {/* Meus relatos */}
        {mine.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-3 font-display text-base font-bold text-ink">Meus relatos</h2>
            <ul className="space-y-2">
              {mine.map((r, i) => {
                const st = STATUS_LABEL[r.status] ?? { txt: r.status, cls: "bg-surface-2 text-muted" };
                return (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-input border border-line bg-surface px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-semibold text-ink">{maskPhone(r.phone)}</span>
                      <span className="text-muted"> · {CATEGORY_LABEL[r.category] ?? r.category}</span>
                    </div>
                    <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.txt}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
