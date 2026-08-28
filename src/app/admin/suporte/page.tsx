import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { timeAgo } from "@/lib/format";
import AdminHeader from "@/components/AdminHeader";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";

function Nav() {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <Link href="/admin" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Denúncias</Link>
      <Link href="/admin/verificacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Verificações</Link>
      <Link href="/admin/clientes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Clientes</Link>
      <Link href="/admin/fotos" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Fotos</Link>
      <Link href="/admin/avaliacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Avaliações</Link>
      <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Suporte</span>
    </nav>
  );
}

export default async function AdminSuportePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const admin = createAdminClient();
  const sp = await searchParams;
  const now = new Date();

  // thread
  if (sp.t) {
    const { data: ticket } = await admin.from("support_tickets").select("id, kind, subject, status, profile_id, profiles ( name )").eq("id", sp.t).maybeSingle();
    if (ticket) {
      const { data: msgs } = await admin.from("support_messages").select("id, from_admin, body, created_at").eq("ticket_id", sp.t).order("created_at", { ascending: true });
      const who = (Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles)?.name || "Anunciante";
      const closed = ticket.status === "fechado";
      return (
        <>
          <AdminHeader />
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
            <Nav />
            <Link href="/admin/suporte" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Voltar</Link>
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-display text-xl font-extrabold text-ink">{who} · {ticket.kind === "chat" ? "chat" : "mensagem"}</h1>
              <span className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${closed ? "bg-surface-2 text-muted" : "bg-[#12331f] text-[#43d17f]"}`}>{closed ? "Fechado" : "Aberto"}</span>
            </div>
            {ticket.subject && <p className="mt-0.5 text-sm text-muted">{ticket.subject}</p>}

            <ul className="mt-4 space-y-2.5">
              {(msgs ?? []).map((m: any) => (
                <li key={m.id} className={`flex ${m.from_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.from_admin ? "bg-accent text-white" : "bg-surface border border-line text-ink"}`}>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">{m.from_admin ? "Suporte (você)" : who}</p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-60">{timeAgo(new Date(m.created_at), now)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <form action="/api/admin/support" method="post" className="mt-4 flex items-end gap-2">
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <input type="hidden" name="action" value="reply" />
              <textarea name="message" rows={2} required placeholder="Responder…" className={`${inputCls} resize-none`} />
              <button className="shrink-0 rounded-input bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong">Responder</button>
            </form>
            <form action="/api/admin/support" method="post" className="mt-2">
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <input type="hidden" name="action" value={closed ? "reopen" : "close"} />
              <button className="text-xs font-semibold text-muted underline hover:text-ink">{closed ? "Reabrir atendimento" : "Marcar como fechado"}</button>
            </form>
          </main>
        </>
      );
    }
  }

  // lista (abertos primeiro)
  const { data: rows } = await admin
    .from("support_tickets")
    .select("id, kind, subject, status, updated_at, profiles ( name )")
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(200);
  const list = (rows ?? []) as any[];

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Nav />
        <h1 className="mb-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Suporte</h1>
        {list.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface/50 px-6 py-14 text-center text-sm text-muted">Nenhum atendimento. 🎉</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => {
              const who = (Array.isArray(t.profiles) ? t.profiles[0] : t.profiles)?.name || "Anunciante";
              return (
                <li key={t.id}>
                  <Link href={`/admin/suporte?t=${t.id}`} className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-accent/60">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{who}</span>
                      <span className="block truncate text-xs text-muted">{t.subject || (t.kind === "chat" ? "Chat" : "Mensagem")} · {timeAgo(new Date(t.updated_at), now)}</span>
                    </div>
                    <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-bold ${t.status === "fechado" ? "bg-surface-2 text-muted" : "bg-[#12331f] text-[#43d17f]"}`}>{t.status === "fechado" ? "Fechado" : "Aberto"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
