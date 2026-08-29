import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import MediaManager from "@/components/MediaManager";
import { VIDEO_ENABLED } from "@/lib/media";
import { PLANS, planBySlug, type PlanSlug } from "@/lib/plans";
import { isAdult } from "@/lib/age";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar fotos", robots: { index: false, follow: false } };

export default async function EditarFotosPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/fotos");

  const admin = createAdminClient();
  const [{ data: ad }, { data: sub }, { data: prof }] = await Promise.all([
    admin.from("ads").select("id").eq("profile_id", user.id).maybeSingle(),
    admin.from("subscriptions").select("plans ( slug )").eq("profile_id", user.id).maybeSingle(),
    admin.from("profiles").select("birthdate").eq("id", user.id).maybeSingle(),
  ]);
  if (!ad) redirect("/meu-anuncio");
  if (!isAdult((prof?.birthdate as string | null) ?? null)) redirect("/meu-anuncio");

  const plan = sub?.plans as unknown as { slug?: string } | null;
  const planLimits = plan?.slug && PLANS.some((x) => x.slug === plan.slug) ? planBySlug(plan.slug as PlanSlug) : PLANS[0];
  const media = (await admin.from("ad_media").select("id, type, storage_path, is_cover, review").eq("ad_id", ad.id).order("position")).data ?? [];

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" /></svg>
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{VIDEO_ENABLED ? "Editar fotos e vídeos" : "Editar fotos"}</h1>
            <p className="text-sm text-muted">Atalho rápido — a 1ª foto vira a capa.</p>
          </div>
        </div>

        <section className={cardCls}>
          <p className="mb-4 text-xs text-muted">
            {VIDEO_ENABLED
              ? `Seu plano (${planLimits.name}): até ${planLimits.maxPhotos} fotos e ${planLimits.maxVideos} vídeo(s).`
              : `Seu plano (${planLimits.name}): até ${planLimits.maxPhotos} fotos.`}
          </p>

          <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex items-center gap-2.5 border-b border-line/70 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" /></svg>
              </span>
              <div>
                <p className="font-display text-sm font-bold text-ink">Regras das fotos</p>
                <p className="text-[11px] text-muted">Pra manter o padrão do site</p>
              </div>
            </div>
            <div className="grid gap-px bg-line/60 sm:grid-cols-2">
              <div className="bg-surface p-4">
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-[#12331f] px-2.5 py-1 text-xs font-bold text-[#43d17f]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>Pode
                </span>
                <ul className="space-y-2 text-sm text-ink/85">
                  {["Fotos sensuais e de lingerie", "Nudez sensual / artística", "Poses provocantes"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface p-4">
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>Não pode
                </span>
                <ul className="space-y-2 text-sm text-ink/85">
                  {["Sexo explícito / penetração", "Masturbação / órgãos em ato", "Qualquer ato sexual explícito"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2 border-t border-line/70 bg-surface-2/40 px-4 py-2.5 text-[11px] text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-px shrink-0 text-muted" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Fotos fora da regra são removidas na moderação e podem reprovar o anúncio.
            </div>
          </div>

          <MediaManager adId={ad.id as string} userId={user.id} initial={media} maxPhotos={planLimits.maxPhotos} maxVideos={planLimits.maxVideos} />
        </section>

        <Link href="/meu-anuncio" className="mt-4 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Voltar ao meu anúncio
        </Link>
      </main>
    </>
  );
}
