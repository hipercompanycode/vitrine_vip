import Link from "next/link";
import PreviewNav from "@/components/PreviewNav";
import { reasonLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const MOCK = [
  { id: "1", reason: "fake", details: "As fotos não são do serviço real.", status: "open", created_at: new Date(Date.now() - 7200_000).toISOString(), ad_id: "3", adTitle: "Diarista / Faxina completa", adHidden: false },
  { id: "2", reason: "golpe", details: "Pediu pagamento adiantado e sumiu.", status: "open", created_at: new Date(Date.now() - 172800_000).toISOString(), ad_id: "8", adTitle: "Fotógrafo para eventos", adHidden: true },
];

export default function PreviewAdminPage() {
  const now = new Date();
  return (
    <>
      <PreviewNav active="home" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Denúncias (preview)</h1>
        <ul className="space-y-3">
          {MOCK.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{reasonLabel(r.reason)}</span>
                <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
              </div>
              <Link href={`/preview/anuncio/${r.ad_id}`} className="mt-2 block font-semibold text-ink underline">{r.adTitle}</Link>
              <p className="mt-1 text-sm text-muted">{r.details}</p>
              <div className="mt-1 text-xs text-muted">status anúncio: {r.adHidden ? "oculto" : "ativo"} · denúncia: {r.status}</div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-ink">{r.adHidden ? "Reexibir anúncio" : "Ocultar anúncio"}</span>
                <span className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-muted">Marcar revisada</span>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
