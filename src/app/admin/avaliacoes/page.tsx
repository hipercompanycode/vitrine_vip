import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { timeAgo } from "@/lib/format";
import { tagLabel } from "@/lib/interactions";
import AdminHeader from "@/components/AdminHeader";
import AdminStats from "@/components/AdminStats";

export const dynamic = "force-dynamic";

export default async function AdminAvaliacoesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("reviews")
    .select("id, ad_id, comment, tags, created_at, moderation_at, profiles ( name ), ads ( title )")
    .eq("status", "moderacao")
    .order("moderation_at", { ascending: false })
    .limit(200);
  const list = (rows ?? []) as any[];
  const now = new Date();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <AdminStats />

        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/admin" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Denúncias</Link>
          <Link href="/admin/verificacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Verificações</Link>
          <Link href="/admin/clientes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Clientes</Link>
          <Link href="/admin/fotos" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Fotos</Link>
          <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Avaliações</span>
        </nav>

        <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Avaliações em moderação</h1>
        <p className="mb-5 max-w-2xl text-sm text-muted">Avaliações que a anunciante enviou pra análise (possível difamação falsa). <strong className="text-ink">Excluir</strong> = apaga de vez. <strong className="text-ink">Liberar</strong> = publica no anúncio.</p>

        {list.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface/50 px-6 py-14 text-center text-sm text-muted">Nenhuma avaliação em moderação. 🎉</div>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {list.map((r) => {
              const author = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name || "Usuário";
              const adTitle = (Array.isArray(r.ads) ? r.ads[0] : r.ads)?.title || "(anúncio)";
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold text-ink">{author}</p>
                      <Link href={`/anuncio/${r.ad_id}`} className="text-sm text-muted underline-offset-2 hover:text-accent hover:underline">avaliou: {adTitle}</Link>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(new Date(r.moderation_at ?? r.created_at), now)}</span>
                  </div>

                  {(r.tags ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(r.tags as string[]).map((t) => <span key={t} className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{tagLabel(t)}</span>)}
                    </div>
                  )}
                  {r.comment && <p className="mt-2 whitespace-pre-wrap rounded-input bg-surface-2/50 px-3 py-2 text-sm text-ink">{r.comment}</p>}

                  <div className="mt-4 flex gap-2 border-t border-line/60 pt-3">
                    <form action="/api/admin/review" method="post" className="flex-1">
                      <input type="hidden" name="review_id" value={r.id} />
                      <input type="hidden" name="action" value="liberar" />
                      <button className="w-full rounded-input bg-[#164a2c] py-2 text-sm font-semibold text-[#7ee2a8] transition-colors hover:bg-[#1b5c37]">Liberar (publicar)</button>
                    </form>
                    <form action="/api/admin/review" method="post" className="flex-1">
                      <input type="hidden" name="review_id" value={r.id} />
                      <input type="hidden" name="action" value="excluir" />
                      <button className="w-full rounded-input bg-red-500/90 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500">Excluir de vez</button>
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
