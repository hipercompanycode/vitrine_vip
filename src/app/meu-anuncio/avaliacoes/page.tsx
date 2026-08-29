import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { tagLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";
import ReviewRespond, { type PendingReview } from "@/components/ReviewRespond";
import ReviewList, { type ReviewItem } from "@/components/ReviewList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avaliações", robots: { index: false, follow: false } };

export default async function MinhasAvaliacoesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/avaliacoes");

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("id, title").eq("profile_id", user.id).maybeSingle();
  if (!ad) redirect("/meu-anuncio");
  const adName = ((ad.title as string | null) ?? "").trim() || "Você";

  const { data: rowsRaw } = await admin
    .from("reviews")
    .select("id, comment, tags, rating, created_at, status, reply, reply_at, due_at, profiles ( name )")
    .eq("ad_id", ad.id)
    .order("created_at", { ascending: false });
  const rows = (rowsRaw ?? []) as any[];
  const nameOf = (r: any) => (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name?.trim() || "Usuário";

  const pending: PendingReview[] = rows
    .filter((r) => r.status === "aguardando")
    .map((r) => ({ id: r.id, comment: r.comment, tags: r.tags ?? [], dueAt: r.due_at ?? null, authorName: nameOf(r) }));
  const published = rows.filter((r) => r.status === "publicada");
  const publishedItems: ReviewItem[] = published.map((r) => ({
    id: r.id, user_id: "", comment: r.comment, tags: r.tags ?? [], rating: r.rating ?? 5, created_at: r.created_at, authorName: nameOf(r), reply: r.reply ?? null,
  }));
  const moderation = rows.filter((r) => r.status === "moderacao");
  const now = new Date();

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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Avaliações</h1>
            <p className="text-sm text-muted">Responda, publique ou envie à moderação.</p>
          </div>
        </div>

        {/* a responder */}
        <section>
          <h2 className="mb-1 font-display text-base font-bold text-ink">A responder {pending.length > 0 && <span className="text-accent">({pending.length})</span>}</h2>
          <p className="mb-3 text-xs text-muted">Ficam <strong className="text-ink">ocultas</strong> até você responder/publicar ou passar 7 dias. Se for difamação falsa, envie à moderação — o admin analisa e pode excluir.</p>
          {pending.length > 0 ? (
            <ul className="space-y-3">
              {pending.map((rv) => <ReviewRespond key={rv.id} review={rv} />)}
            </ul>
          ) : (
            <div className="rounded-card border border-dashed border-line bg-surface/50 px-5 py-8 text-center text-sm text-muted">Nenhuma avaliação aguardando. 🎉</div>
          )}
        </section>

        {/* publicadas — accordion (a lista pode ficar grande) */}
        <section>
          {published.length > 0 ? (
            <details open={published.length <= 5} className="group overflow-hidden rounded-card border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 font-display text-base font-bold text-ink transition-colors hover:text-accent">
                <span>Publicadas <span className="text-muted">({published.length})</span></span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted transition-transform group-open:rotate-180" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </summary>
              <div className="border-t border-line/60 px-4 pb-3 pt-1">
                <ReviewList reviews={publishedItems} now={now} currentUserId={null} adId={ad.id as string} adName={adName} />
              </div>
            </details>
          ) : (
            <>
              <h2 className="mb-3 font-display text-base font-bold text-ink">Publicadas</h2>
              <div className="rounded-card border border-dashed border-line bg-surface/50 px-5 py-8 text-center text-sm text-muted">Nenhuma avaliação publicada ainda.</div>
            </>
          )}
        </section>

        {/* em moderação */}
        {moderation.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-base font-bold text-ink">Em moderação <span className="text-muted">({moderation.length})</span></h2>
            <ul className="space-y-3">
              {moderation.map((r) => (
                <li key={r.id} className="rounded-card border border-red-500/30 bg-red-500/5 p-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-ink">{nameOf(r)}</span>
                    {(r.tags ?? []).map((t: string) => (
                      <span key={t} className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{tagLabel(t)}</span>
                    ))}
                    <span className="ml-auto inline-flex items-center gap-1 rounded-pill bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-300">aguardando o admin</span>
                  </div>
                  {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink/90">{r.comment}</p>}
                  <p className="mt-2 text-[11px] text-muted">Você enviou à moderação. Fica oculta até o admin decidir.</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
