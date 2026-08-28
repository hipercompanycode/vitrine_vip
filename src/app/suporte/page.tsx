import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { userHasAd } from "@/lib/ads";
import { timeAgo } from "@/lib/format";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suporte", robots: { index: false, follow: false } };

const inputCls = "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";

export default async function SuportePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/suporte");

  const admin = createAdminClient();
  const hasAd = await userHasAd(admin, user.id);
  const sp = await searchParams;

  // thread selecionado
  if (sp.t) {
    const { data: ticket } = await admin.from("support_tickets").select("id, kind, subject, status, profile_id").eq("id", sp.t).maybeSingle();
    if (ticket && ticket.profile_id === user.id) {
      const { data: msgs } = await admin.from("support_messages").select("id, from_admin, body, created_at").eq("ticket_id", sp.t).order("created_at", { ascending: true });
      const now = new Date();
      const closed = ticket.status === "fechado";
      return (
        <>
          <SiteHeader loggedIn hasAd={hasAd} />
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
            <div className="flex items-center justify-between gap-2 py-6">
              <Link href="/suporte" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Meus atendimentos
              </Link>
              <span className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${closed ? "bg-surface-2 text-muted" : "bg-[#12331f] text-[#43d17f]"}`}>{closed ? "Fechado" : "Aberto"}</span>
            </div>
            <h1 className="mb-1 font-display text-xl font-extrabold text-ink">{ticket.subject || (ticket.kind === "chat" ? "Chat com o suporte" : "Sua mensagem")}</h1>

            <ul className="mt-4 space-y-2.5">
              {(msgs ?? []).map((m: any) => (
                <li key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.from_admin ? "bg-surface border border-line text-ink" : "bg-accent text-white"}`}>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">{m.from_admin ? "Suporte" : "Você"}</p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-60">{timeAgo(new Date(m.created_at), now)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <form action="/api/support/message" method="post" className="mt-4 flex items-end gap-2">
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <textarea name="message" rows={2} required placeholder="Escreva uma mensagem…" className={`${inputCls} resize-none`} />
              <button className="shrink-0 rounded-input bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong">Enviar</button>
            </form>
          </main>
        </>
      );
    }
  }

  // lista + opções
  const { data: ticketsRaw } = await admin.from("support_tickets").select("id, kind, subject, status, updated_at").eq("profile_id", user.id).order("updated_at", { ascending: false }).limit(50);
  const tickets = (ticketsRaw ?? []) as any[];
  const now = new Date();

  return (
    <>
      <SiteHeader loggedIn hasAd={hasAd} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        <div className="py-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Suporte</h1>
          <p className="mt-1 text-sm text-muted">Precisa de ajuda? Escolha como quer falar com a gente.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* enviar mensagem */}
          <form action="/api/support/create" method="post" className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
            <input type="hidden" name="kind" value="mensagem" />
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H7l-3 3V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
              </span>
              <div><p className="font-display text-sm font-bold text-ink">Enviar uma mensagem</p><p className="text-[11px] text-muted">Respondemos assim que der</p></div>
            </div>
            <input name="subject" placeholder="Assunto (opcional)" className={`${inputCls} mb-2`} />
            <textarea name="message" rows={3} required placeholder="Como podemos ajudar?" className={`${inputCls} resize-none`} />
            <button className="mt-3 rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong">Enviar mensagem</button>
          </form>

          {/* abrir chat */}
          <form action="/api/support/create" method="post" className="flex flex-col rounded-2xl border border-accent/40 bg-accent-soft/25 p-5 shadow-card">
            <input type="hidden" name="kind" value="chat" />
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
              </span>
              <div><p className="font-display text-sm font-bold text-ink">Abrir um chat</p><p className="text-[11px] text-muted">Conversa de ida e volta</p></div>
            </div>
            <textarea name="message" rows={3} required placeholder="Comece a conversa…" className={`${inputCls} resize-none`} />
            <button className="mt-3 rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong">Abrir chat</button>
          </form>
        </div>

        {tickets.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-base font-bold text-ink">Meus atendimentos</h2>
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/suporte?t=${t.id}`} className="flex items-center justify-between gap-2 rounded-input border border-line bg-surface px-4 py-3 transition-colors hover:border-accent/60">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{t.subject || (t.kind === "chat" ? "Chat com o suporte" : "Mensagem ao suporte")}</span>
                      <span className="text-xs text-muted">Atualizado {timeAgo(new Date(t.updated_at), now)}</span>
                    </div>
                    <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-bold ${t.status === "fechado" ? "bg-surface-2 text-muted" : "bg-[#12331f] text-[#43d17f]"}`}>{t.status === "fechado" ? "Fechado" : "Aberto"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
