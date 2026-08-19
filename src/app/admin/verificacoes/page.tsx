import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-accent-soft text-accent" },
  approved: { label: "Aprovada", cls: "bg-[#12331f] text-[#43d17f]" },
  rejected: { label: "Recusada", cls: "bg-red-500/15 text-red-300" },
};

export default async function AdminVerifPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("verifications")
    .select("profile_id, doc_path, video_path, status, created_at, profiles ( name )")
    .order("created_at", { ascending: false });
  const list = (rows ?? []) as any[];
  const ord: Record<string, number> = { pending: 0, rejected: 1, approved: 2 };
  list.sort((a, b) => (ord[a.status] ?? 9) - (ord[b.status] ?? 9));

  const pids = list.map((r) => r.profile_id);
  const adTitle = new Map<string, string>();
  if (pids.length) {
    const { data: ads } = await admin.from("ads").select("profile_id, title").in("profile_id", pids);
    (ads ?? []).forEach((a: any) => adTitle.set(a.profile_id, a.title));
  }

  const signed = await Promise.all(list.map(async (r) => ({
    doc: r.doc_path ? (await admin.storage.from("verifications").createSignedUrl(r.doc_path, 600)).data?.signedUrl ?? null : null,
    vid: r.video_path ? (await admin.storage.from("verifications").createSignedUrl(r.video_path, 600)).data?.signedUrl ?? null : null,
  })));

  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <nav className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/admin" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Denúncias</Link>
        <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Verificações</span>
      </nav>

      <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Verificações</h1>

      {list.length === 0 ? (
        <p className="text-muted">Nenhuma comprovação enviada.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((r, i) => {
            const st = STATUS[r.status] ?? { label: r.status, cls: "bg-surface-2 text-muted" };
            const name = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name || "(sem nome)";
            return (
              <li key={r.profile_id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="text-xs text-muted">{adTitle.get(r.profile_id) ?? "(sem anúncio)"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted">Documento com foto</p>
                    {signed[i].doc ? (
                      <a href={signed[i].doc!} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={signed[i].doc!} alt="Documento" className="max-h-56 w-full rounded-input border border-line object-contain" />
                      </a>
                    ) : <p className="text-xs text-muted">—</p>}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted">Vídeo</p>
                    {signed[i].vid ? (
                      <video src={signed[i].vid!} controls className="max-h-56 w-full rounded-input border border-line" />
                    ) : <p className="text-xs text-muted">—</p>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action="/api/admin/verify" method="post">
                    <input type="hidden" name="profile_id" value={r.profile_id} />
                    <input type="hidden" name="action" value="approve" />
                    <button className="rounded-input bg-[#164a2c] px-4 py-1.5 text-sm font-semibold text-[#7ee2a8] hover:bg-[#1b5c37]">Aprovar (liga selo)</button>
                  </form>
                  <form action="/api/admin/verify" method="post">
                    <input type="hidden" name="profile_id" value={r.profile_id} />
                    <input type="hidden" name="action" value="reject" />
                    <button className="rounded-input border border-line px-4 py-1.5 text-sm font-semibold text-muted hover:text-red-300">Recusar</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
