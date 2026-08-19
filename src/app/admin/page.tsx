import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { reasonLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("reports")
    .select("id, reason, details, status, created_at, ad_id, ads ( title, status )")
    .order("created_at", { ascending: false });

  const now = new Date();
  const rows = (reports ?? []) as any[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <nav className="mb-6 flex items-center gap-2 text-sm">
        <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Denúncias</span>
        <Link href="/admin/verificacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Verificações</Link>
      </nav>
      <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Denúncias
      </h1>
      {rows.length === 0 ? (
        <p className="text-muted">Nenhuma denúncia.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const ad = Array.isArray(r.ads) ? r.ads[0] : r.ads;
            const hidden = ad?.status === "hidden";
            return (
              <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                    {reasonLabel(r.reason)}
                  </span>
                  <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
                </div>
                <Link href={`/anuncio/${r.ad_id}`} className="mt-2 block font-semibold text-ink underline">
                  {ad?.title ?? "(anúncio removido)"}
                </Link>
                {r.details && <p className="mt-1 text-sm text-muted">{r.details}</p>}
                <div className="mt-1 text-xs text-muted">
                  status anúncio: {hidden ? "oculto" : "ativo"} · denúncia: {r.status}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action="/api/admin/hide" method="post">
                    <input type="hidden" name="ad_id" value={r.ad_id} />
                    <input type="hidden" name="status" value={hidden ? "active" : "hidden"} />
                    <button className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-accent-soft">
                      {hidden ? "Reexibir anúncio" : "Ocultar anúncio"}
                    </button>
                  </form>
                  {r.status === "open" && (
                    <form action="/api/admin/report" method="post">
                      <input type="hidden" name="report_id" value={r.id} />
                      <button className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink">
                        Marcar revisada
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
