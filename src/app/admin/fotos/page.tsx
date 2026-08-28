import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { publicUrl } from "@/lib/storage";
import AdminHeader from "@/components/AdminHeader";
import AdminStats from "@/components/AdminStats";

export const dynamic = "force-dynamic";

type Filter = "pendentes" | "nudez" | "todas";

export default async function AdminFotosPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const sp = await searchParams;
  const f: Filter = sp.f === "nudez" ? "nudez" : sp.f === "todas" ? "todas" : "pendentes";
  const backHref = `/admin/fotos?f=${f}`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createAdminClient();

  const [pC, nC] = await Promise.all([
    admin.from("ad_media").select("id", { count: "exact", head: true }).eq("type", "photo").eq("review", "pendente"),
    admin.from("ad_media").select("id", { count: "exact", head: true }).eq("type", "photo").eq("review", "nudez"),
  ]);
  const pendentes = pC.count ?? 0;
  const nudez = nC.count ?? 0;

  let q = admin
    .from("ad_media")
    .select("id, ad_id, storage_path, review, is_cover, ads ( title )")
    .eq("type", "photo")
    .limit(300);
  if (f === "pendentes") q = q.eq("review", "pendente");
  else if (f === "nudez") q = q.eq("review", "nudez");
  else q = q.in("review", ["pendente", "nudez"]);
  const { data: rows } = await q;
  const list = (rows ?? []) as any[];

  const TABS: { key: Filter; label: string; badge?: number }[] = [
    { key: "pendentes", label: "Pendentes", badge: pendentes },
    { key: "nudez", label: "Nudez", badge: nudez },
    { key: "todas", label: "Todas" },
  ];

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <AdminStats />

        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/admin" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Denúncias</Link>
          <Link href="/admin/verificacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Verificações</Link>
          <Link href="/admin/clientes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Clientes</Link>
          <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Fotos</span>
          <Link href="/admin/avaliacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Avaliações</Link>
        </nav>

        <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Revisão de fotos</h1>
        <p className="mb-4 max-w-2xl text-sm text-muted"><strong className="text-ink">Liberar</strong> = nítida pra todos. <strong className="text-ink">Nudez</strong> = borrada pra quem não está logado (ECA). <strong className="text-ink">Excluir</strong> = sexo explícito / fora das regras. Pendentes não aparecem no anúncio até você decidir.</p>

        <div className="mb-5 inline-flex flex-wrap rounded-pill border border-line bg-surface p-1">
          {TABS.map((t) => {
            const active = t.key === f;
            return (
              <Link key={t.key} href={`/admin/fotos?f=${t.key}`}
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
          <div className="rounded-card border border-dashed border-line bg-surface/50 px-6 py-14 text-center text-sm text-muted">Nada pra revisar aqui. 🎉</div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {list.map((r) => {
              const title = (Array.isArray(r.ads) ? r.ads[0] : r.ads)?.title || "(anúncio)";
              return (
                <li key={r.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                  <div className="relative">
                    {/* admin vê a original */}
                    <img src={publicUrl(base, "ad-media", r.storage_path)} alt="" className="aspect-[3/4] w-full object-cover" />
                    <span className={`absolute left-2 top-2 rounded-pill px-2 py-0.5 text-[10px] font-bold ${r.review === "nudez" ? "bg-amber-500/90 text-[#231a06]" : "bg-black/70 text-white"}`}>
                      {r.review === "nudez" ? "🔞 Nudez" : "⏳ Pendente"}
                    </span>
                    {r.is_cover && <span className="absolute right-2 top-2 rounded-pill bg-accent px-2 py-0.5 text-[10px] font-bold text-white">Capa</span>}
                  </div>
                  <div className="p-2.5">
                    <Link href={`/anuncio/${r.ad_id}`} className="mb-2 block truncate text-xs font-semibold text-ink hover:text-accent">{title}</Link>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Form mediaId={r.id} action="liberar" back={backHref} cls="bg-[#164a2c] text-[#7ee2a8] hover:bg-[#1b5c37]" label="Liberar" />
                      <Form mediaId={r.id} action="nudez" back={backHref} cls="bg-amber-500/85 text-[#231a06] hover:bg-amber-500" label="Nudez" />
                      <Form mediaId={r.id} action="excluir" back={backHref} cls="bg-red-500/90 text-white hover:bg-red-500" label="Excluir" />
                    </div>
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

function Form({ mediaId, action, back, cls, label }: { mediaId: string; action: string; back: string; cls: string; label: string }) {
  return (
    <form action="/api/admin/media-review" method="post">
      <input type="hidden" name="media_id" value={mediaId} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="back" value={back} />
      <button className={`w-full rounded-input py-1.5 text-[11px] font-bold transition-colors ${cls}`}>{label}</button>
    </form>
  );
}
