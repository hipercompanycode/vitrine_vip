import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { PLANS } from "@/lib/plans";
import { cardCls } from "@/components/ui";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PlanosPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Planos</h1>
        <p className="mt-1 text-sm text-muted">Assine para deixar seu anúncio visível. Cartão (mensal) ou Pix (30 dias).</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.slug} className={cardCls}>
              <h2 className="font-display text-lg font-bold text-ink">{p.name}</h2>
              <p className="mt-1 text-2xl font-extrabold text-accent">{brl(p.priceCents)}<span className="text-sm font-medium text-muted">/mês</span></p>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                <li>{p.maxPhotos} fotos · {p.maxVideos} vídeo(s)</li>
                <li>{p.allowsStory ? "Story 24h incluído" : "Sem story"}</li>
                <li>{p.bumpCooldownMinutes === 0 ? "Subir a qualquer hora" : `Subir a cada ${p.bumpCooldownMinutes} min`}</li>
              </ul>
              <Link href={`/assinar/${p.slug}`} className="mt-4 block rounded-input bg-accent py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">
                Assinar
              </Link>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
