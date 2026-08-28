import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import StateCityPicker from "@/components/StateCityPicker";
import { labelCls, cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Alterar cidade", robots: { index: false, follow: false } };

export default async function AlterarCidadePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/cidade");

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("id, city_id").eq("profile_id", user.id).maybeSingle();
  if (!ad) redirect("/meu-anuncio");

  const defaultCity = ad.city_id
    ? (await admin.from("cities").select("id,name,uf").eq("id", ad.city_id).maybeSingle()).data
    : null;

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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" /></svg>
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Alterar cidade</h1>
            <p className="text-sm text-muted">Atalho rápido — troca só onde você atende.</p>
          </div>
        </div>

        <section className={cardCls}>
          <form action="/api/ads" method="post" className="space-y-5">
            <input type="hidden" name="has_city" value="1" />
            <input type="hidden" name="next" value="/meu-anuncio" />
            <div className="block">
              <span className={labelCls}>Estado e cidade <span className="text-accent">*</span></span>
              <StateCityPicker defaultCity={defaultCity ?? null} />
            </div>
            <button className="flex w-full items-center justify-center gap-2 rounded-input bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent-strong">
              Salvar cidade
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
