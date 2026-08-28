import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { timeAgo } from "@/lib/format";
import AdminHeader from "@/components/AdminHeader";
import AdminStats from "@/components/AdminStats";
import VerificationPhotos from "@/components/VerificationPhotos";
import { maskCpf } from "@/lib/cpf";
import { hamming, DUP_THRESHOLD } from "@/lib/phash";

export const dynamic = "force-dynamic";

type Filter = "pendentes" | "aprovadas" | "recusadas" | "todas";

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pendente", cls: "bg-accent-soft text-accent", dot: "bg-accent" },
  approved: { label: "Aprovada", cls: "bg-[#12331f] text-[#43d17f]", dot: "bg-[#43d17f]" },
  rejected: { label: "Recusada", cls: "bg-red-500/15 text-red-300", dot: "bg-red-400" },
};

function Stat({ label, value, tone }: { label: string; value: number; tone: "accent" | "green" | "red" }) {
  const color = tone === "accent" ? "text-accent" : tone === "green" ? "text-[#43d17f]" : "text-red-300";
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 font-display text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

export default async function AdminVerifPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) notFound();

  const sp = await searchParams;
  const f: Filter = sp.f === "aprovadas" ? "aprovadas" : sp.f === "recusadas" ? "recusadas" : sp.f === "todas" ? "todas" : "pendentes";
  const backHref = `/admin/verificacoes?f=${f}`;

  const admin = createAdminClient();

  const [pC, aC, rC] = await Promise.all([
    admin.from("verifications").select("profile_id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("verifications").select("profile_id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("verifications").select("profile_id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);
  const pendingCount = pC.count ?? 0;
  const approvedCount = aC.count ?? 0;
  const rejectedCount = rC.count ?? 0;

  let query = admin
    .from("verifications")
    .select("profile_id, doc_path, face_path, body_path, prev_face_path, cpf, liveness_code, face_hash, body_hash, reverify_reason, status, feedback, created_at, profiles ( name, last_country, geo_flag, referred_by )")
    .order("created_at", { ascending: false })
    .limit(200);
  if (f === "pendentes") query = query.eq("status", "pending");
  else if (f === "aprovadas") query = query.eq("status", "approved");
  else if (f === "recusadas") query = query.eq("status", "rejected");
  const { data: rows } = await query;
  const list = (rows ?? []) as any[];

  const pids = list.map((r) => r.profile_id);

  // Detecção de foto duplicada (pHash): compara as fotos de cada verificação
  // com TODAS as outras. Se a mesma imagem aparece em outro perfil -> sinaliza.
  const { data: allH } = await admin.from("verifications").select("profile_id, face_hash, body_hash");
  const allHashes = (allH ?? []) as { profile_id: string; face_hash: string | null; body_hash: string | null }[];
  const dupMap = new Map<string, string[]>();
  for (const r of list) {
    const hits = new Set<string>();
    for (const o of allHashes) {
      if (o.profile_id === r.profile_id) continue;
      if (hamming(r.face_hash, o.face_hash) <= DUP_THRESHOLD || hamming(r.body_hash, o.body_hash) <= DUP_THRESHOLD) {
        hits.add(o.profile_id);
      }
    }
    if (hits.size) dupMap.set(r.profile_id, [...hits]);
  }

  // título + id do anúncio p/ link (dos listados + dos perfis batidos como duplicata)
  const linkPids = Array.from(new Set([...pids, ...[...dupMap.values()].flat()]));
  const adByProfile = new Map<string, { id: string; title: string }>();
  if (linkPids.length) {
    const { data: ads } = await admin.from("ads").select("id, profile_id, title").in("profile_id", linkPids);
    (ads ?? []).forEach((a: any) => adByProfile.set(a.profile_id, { id: a.id, title: a.title }));
  }

  // quem indicou cada perfil (nome público = título do anúncio de quem indicou)
  const referrerIds = Array.from(new Set(list.map((r) => (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.referred_by).filter(Boolean))) as string[];
  const refNameByProfile = new Map<string, string>();
  if (referrerIds.length) {
    const { data: refAds } = await admin.from("ads").select("profile_id, title").in("profile_id", referrerIds);
    (refAds ?? []).forEach((a: any) => refNameByProfile.set(a.profile_id, a.title));
  }

  // quem tem cortesia (acesso vitalício) ativa
  const cortesiaSet = new Set<string>();
  if (pids.length) {
    const { data: subs } = await admin.from("subscriptions").select("profile_id, method, status").in("profile_id", pids);
    (subs ?? []).forEach((s: any) => { if (s.method === "cortesia" && s.status === "active") cortesiaSet.add(s.profile_id); });
  }

  const sign = async (p: string | null) => (p ? (await admin.storage.from("verifications").createSignedUrl(p, 600)).data?.signedUrl ?? null : null);
  const signed = await Promise.all(list.map(async (r) => ({
    doc: await sign(r.doc_path), face: await sign(r.face_path), body: await sign(r.body_path), prev: await sign(r.prev_face_path),
  })));

  const now = new Date();

  const TABS: { key: Filter; label: string; badge?: number }[] = [
    { key: "pendentes", label: "Pendentes", badge: pendingCount },
    { key: "aprovadas", label: "Aprovadas", badge: approvedCount },
    { key: "recusadas", label: "Recusadas", badge: rejectedCount },
    { key: "todas", label: "Todas" },
  ];

  const emptyMsg =
    f === "pendentes" ? "Nenhuma verificação pendente. Tudo em dia! 🎉"
    : f === "aprovadas" ? "Nenhuma verificação aprovada ainda."
    : f === "recusadas" ? "Nenhuma verificação recusada."
    : "Nenhuma comprovação enviada.";

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <AdminStats />

        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/admin" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Denúncias</Link>
          <span className="rounded-pill bg-accent px-3 py-1.5 font-semibold text-white">Verificações</span>
          <Link href="/admin/clientes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Clientes</Link>
          <Link href="/admin/fotos" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Fotos</Link>
          <Link href="/admin/avaliacoes" className="rounded-pill px-3 py-1.5 font-semibold text-muted hover:bg-accent-soft hover:text-accent">Avaliações</Link>
        </nav>

        <h1 className="mb-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Verificações</h1>

        {/* stats */}
        <div className="mb-5 grid max-w-2xl grid-cols-3 gap-3">
          <Stat label="Pendentes" value={pendingCount} tone="accent" />
          <Stat label="Aprovadas" value={approvedCount} tone="green" />
          <Stat label="Recusadas" value={rejectedCount} tone="red" />
        </div>

        {/* abas */}
        <div className="mb-5 inline-flex flex-wrap rounded-pill border border-line bg-surface p-1">
          {TABS.map((t) => {
            const active = t.key === f;
            return (
              <Link
                key={t.key}
                href={`/admin/verificacoes?f=${t.key}`}
                className={`inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-accent text-white" : "text-muted hover:text-ink"
                }`}
              >
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
              const prof0 = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
              const name = prof0?.name || "(sem nome)";
              const country = prof0?.last_country as string | null | undefined;
              const geoFlag = prof0?.geo_flag as string | null | undefined;
              const ad = adByProfile.get(r.profile_id);
              const dup = dupMap.get(r.profile_id) ?? [];
              const cortesia = cortesiaSet.has(r.profile_id);
              return (
                <li key={r.profile_id} className="rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-accent/40 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-ink">{name}</p>
                      {ad ? (
                        <Link href={`/anuncio/${ad.id}`} className="inline-flex items-center gap-1 text-sm text-muted underline-offset-2 transition-colors hover:text-accent hover:underline">
                          {ad.title}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </Link>
                      ) : (
                        <p className="text-sm text-muted">(sem anúncio)</p>
                      )}
                      {r.cpf && (
                        <p className="mt-0.5 font-mono text-xs text-muted">CPF: {maskCpf(r.cpf as string)}</p>
                      )}
                      {r.reverify_reason && (
                        <p className="mt-0.5 text-xs font-semibold text-amber-300">🔐 Reverificação — {r.reverify_reason}</p>
                      )}
                      {country && (
                        <p className="mt-0.5 text-xs text-muted">País (IP): <span className="font-semibold text-ink">{country}</span></p>
                      )}
                      {geoFlag && (
                        <p className="mt-0.5 text-xs font-semibold text-amber-300">📍 {geoFlag}</p>
                      )}
                      {prof0?.referred_by && refNameByProfile.get(prof0.referred_by) && (
                        <p className="mt-0.5 text-xs text-muted">Indicada por <span className="font-semibold text-ink">{refNameByProfile.get(prof0.referred_by)}</span></p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
                    </div>
                  </div>

                  {dup.length > 0 && (
                    <div className="mt-3 rounded-input border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      <span className="font-bold text-red-300">⚠️ Foto duplicada:</span> a mesma imagem aparece em {dup.length} outro(s) perfil(is)
                      {dup.some((p) => adByProfile.get(p)) && (
                        <> — {dup.map((p) => adByProfile.get(p)).filter(Boolean).map((a, k) => (
                          <span key={a!.id}>{k > 0 ? ", " : " "}<Link href={`/anuncio/${a!.id}`} className="underline hover:text-red-100">{a!.title}</Link></span>
                        ))}</>
                      )}. Forte sinal de fake/foto roubada.
                    </div>
                  )}

                  {r.liveness_code && (
                    <div className="mt-3 rounded-input border border-accent/40 bg-accent-soft/50 px-3 py-2 text-xs">
                      <span className="text-muted">Código que deve aparecer no papel da selfie:</span>{" "}
                      <span className="font-mono text-sm font-extrabold tracking-widest text-accent">VITRINE {r.liveness_code}</span>
                      <span className="text-muted"> · data ~ {timeAgo(new Date(r.created_at), now)}</span>
                    </div>
                  )}

                  <div className="mt-3">
                    <VerificationPhotos photos={[
                      { label: "Documento", url: signed[i].doc },
                      ...(signed[i].prev ? [{ label: "Selfie ANTERIOR", url: signed[i].prev }] : []),
                      { label: signed[i].prev ? "Selfie NOVA" : "Selfie c/ papel", url: signed[i].face },
                      { label: "Corpo + rosto", url: signed[i].body },
                    ]} />
                  </div>

                  <div className="mt-4 space-y-2 border-t border-line/60 pt-3">
                    <form action="/api/admin/verify" method="post">
                      <input type="hidden" name="profile_id" value={r.profile_id} />
                      <input type="hidden" name="action" value="approve" />
                      <input type="hidden" name="back" value={backHref} />
                      <button
                        disabled={r.status === "approved"}
                        className="w-full rounded-input bg-[#164a2c] py-2 text-sm font-semibold text-[#7ee2a8] transition-colors hover:bg-[#1b5c37] disabled:cursor-default disabled:opacity-50"
                      >
                        {r.status === "approved" ? "Aprovada ✓" : "Aprovar (liga selo)"}
                      </button>
                    </form>

                    <details className="group overflow-hidden rounded-input border border-line open:border-red-500/40" open={r.status === "rejected"}>
                      <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-red-300">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        {r.status === "rejected" ? "Recusada — editar motivo" : "Recusar com motivo"}
                      </summary>
                      <form action="/api/admin/verify" method="post" className="space-y-2 border-t border-line/60 bg-surface-2/30 p-3">
                        <input type="hidden" name="profile_id" value={r.profile_id} />
                        <input type="hidden" name="action" value="reject" />
                        <input type="hidden" name="back" value={backHref} />
                        <textarea
                          name="feedback"
                          rows={2}
                          required
                          defaultValue={r.feedback ?? ""}
                          placeholder="Motivo da recusa (o anunciante vê). Ex.: documento ilegível, foto de rosto não confere."
                          className="w-full resize-none rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
                        />
                        {r.cpf && (
                          <label className="flex items-start gap-2 rounded-input border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-muted">
                            <input type="checkbox" name="block_cpf" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-red-500" />
                            <span><strong className="text-red-300">Bloquear este CPF</strong> — impede novas verificações/contas com este CPF. Use para fake confirmado.</span>
                          </label>
                        )}
                        <button className="w-full rounded-input bg-red-500/90 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500">Confirmar recusa</button>
                      </form>
                    </details>

                    <form action="/api/admin/cortesia" method="post">
                      <input type="hidden" name="profile_id" value={r.profile_id} />
                      <input type="hidden" name="action" value={cortesia ? "revoke" : "grant"} />
                      <input type="hidden" name="back" value={backHref} />
                      <button className={`w-full rounded-input py-2 text-sm font-semibold transition-colors ${cortesia ? "border border-line bg-surface-2 text-muted hover:text-ink" : "border border-accent/40 bg-accent-soft/50 text-accent hover:bg-accent-soft"}`}>
                        {cortesia ? "🎁 Remover acesso vitalício" : "🎁 Conceder acesso vitalício (cortesia)"}
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
