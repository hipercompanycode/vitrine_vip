import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notificações", robots: { index: false, follow: false } };

type Notif = { id: number; kind: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string };

// ícone por tipo de notificação
function KindIcon({ kind }: { kind: string }) {
  const cls = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full";
  if (kind === "moderation") return (
    <span className={`${cls} bg-[#43d17f]/15 text-[#43d17f]`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  );
  if (kind === "review") return (
    <span className={`${cls} bg-accent-soft text-accent`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></span>
  );
  if (kind === "support") return (
    <span className={`${cls} bg-sky-500/15 text-sky-300`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg></span>
  );
  return (
    <span className={`${cls} bg-surface-2 text-muted`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  );
}

function Item({ n, isNew, now }: { n: Notif; isNew: boolean; now: Date }) {
  const inner = (
    <div className={`flex items-start gap-3 rounded-card border px-4 py-3.5 transition-colors ${isNew ? "border-accent/40 bg-accent-soft/25" : "border-line bg-surface"} ${n.href ? "hover:border-accent" : ""}`}>
      <KindIcon kind={n.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-ink">{n.title}</p>
          {isNew && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="nova" />}
        </div>
        {n.body && <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{n.body}</p>}
        <p className="mt-1 text-[11px] text-muted/80">{timeAgo(new Date(n.created_at), now)}</p>
      </div>
      {n.href && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-1 shrink-0 text-muted" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
  );
  return n.href ? <Link href={n.href} className="block">{inner}</Link> : inner;
}

export default async function NotificacoesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/notificacoes");

  const admin = createAdminClient();
  const [{ data: rowsRaw }, { data: sub }] = await Promise.all([
    admin.from("notifications").select("id, kind, title, body, href, read_at, created_at")
      .eq("profile_id", user.id).order("created_at", { ascending: false }).limit(100),
    admin.from("subscriptions").select("status, current_period_end").eq("profile_id", user.id).maybeSingle(),
  ]);
  const rows = (rowsRaw ?? []) as Notif[];
  // quais estavam não-lidas nesta visita (pra mostrar o ponto "nova")
  const newIds = new Set(rows.filter((r) => !r.read_at).map((r) => r.id));
  // marca todas como lidas ao abrir a tela
  if (newIds.size) await admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", user.id).is("read_at", null);

  const now = new Date();
  const active = isActive(sub as { status: string; current_period_end: string | null } | null, now);
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end as string) : null;
  const daysToExpiry = periodEnd ? Math.ceil((periodEnd.getTime() - now.getTime()) / 86_400_000) : null;
  const expiringSoon = active && daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry <= 7;

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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Notificações</h1>
            <p className="text-sm text-muted">Moderação, avaliações, suporte e avisos da conta.</p>
          </div>
        </div>

        {expiringSoon && (
          <Link href="/meu-anuncio" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 transition-colors hover:border-amber-500/70">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8v5m0 3h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{daysToExpiry === 0 ? "Sua assinatura vence hoje" : `Sua assinatura vence em ${daysToExpiry} dia${daysToExpiry === 1 ? "" : "s"}`}</p>
              <p className="text-xs text-muted">Renove via Pix para não sair da vitrine.</p>
            </div>
          </Link>
        )}

        {rows.length > 0 ? (
          <ul className="space-y-2.5">
            {rows.map((n) => <li key={n.id}><Item n={n} isNew={newIds.has(n.id)} now={now} /></li>)}
          </ul>
        ) : (
          <div className="rounded-card border border-dashed border-line bg-surface/50 px-5 py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <p className="text-sm font-semibold text-ink">Tudo em dia</p>
            <p className="mt-1 text-sm text-muted">Você não tem notificações por enquanto.</p>
          </div>
        )}
      </main>
    </>
  );
}
