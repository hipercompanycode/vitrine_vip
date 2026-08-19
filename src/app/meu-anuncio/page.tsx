import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import { PLANS, planBySlug, type PlanSlug } from "@/lib/plans";
import { AdBasicsForm, AdAttributesForm } from "../perfil/ad-form";
import MediaManager from "@/components/MediaManager";
import BillingButton from "@/components/BillingButton";
import PlanCards from "@/components/PlanCards";
import VerificationUploader from "@/components/VerificationUploader";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";

const STEPS = ["Dados", "Características", "Plano", "Comprovações"];

function AccountHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-baseline gap-0.5">
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine</span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/perfil" className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">Meu perfil</Link>
          <form action="/logout" method="post"><button className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">Sair</button></form>
        </nav>
      </div>
    </header>
  );
}

function Stepper({ step, done }: { step: number; done: boolean[] }) {
  return (
    <ol className="mb-8 flex items-center">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const complete = done[i];
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <Link href={`/meu-anuncio?step=${n}`} className="flex flex-col items-center gap-1.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-sm font-bold transition-colors ${
                active ? "border-accent bg-accent text-white" : complete ? "border-[#2a7d4f] bg-[#123]/0 text-[#43d17f]" : "border-line bg-surface text-muted"
              }`}>
                {complete && !active ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : n}
              </span>
              <span className={`hidden text-[11px] font-semibold sm:block ${active ? "text-ink" : "text-muted"}`}>{label}</span>
            </Link>
            {n < STEPS.length && <span className={`mx-2 h-0.5 flex-1 rounded ${done[i] ? "bg-accent/50" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function StepNav({ step, canNext, nextHref }: { step: number; canNext: boolean; nextHref: string }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      {step > 1 ? (
        <Link href={`/meu-anuncio?step=${step - 1}`} className="rounded-input border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2">← Voltar</Link>
      ) : <span />}
      {step < 4 ? (
        canNext ? (
          <Link href={nextHref} className="rounded-input bg-accent px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">Próximo →</Link>
        ) : (
          <span className="rounded-input bg-surface-2 px-6 py-2.5 text-sm font-bold text-muted">Próximo →</span>
        )
      ) : (
        <Link href="/" className="rounded-input bg-accent px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong">Concluir</Link>
      )}
    </div>
  );
}

export default async function MeuAnuncioPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio");

  const admin = createAdminClient();
  await admin.from("profiles").update({ role: "anunciante" }).eq("id", user.id).eq("role", "comum");

  const [{ data: ad }, { data: cities }, { data: sub }, { data: verif }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
    admin.from("subscriptions").select("status, method, current_period_end, stripe_customer_id, plans ( slug, allows_story )").eq("profile_id", user.id).maybeSingle(),
    admin.from("verifications").select("status, doc_path, video_path").eq("profile_id", user.id).maybeSingle(),
  ]);

  const plan = sub?.plans as unknown as { slug?: string; allows_story?: boolean } | null;
  const active = isActive(sub as { status: string; current_period_end: string | null } | null, new Date());
  const planLimits = plan?.slug && PLANS.some((x) => x.slug === plan.slug) ? planBySlug(plan.slug as PlanSlug) : PLANS[0];

  const media = ad ? (await admin.from("ad_media").select("id, type, storage_path, is_cover").eq("ad_id", ad.id).order("position")).data ?? [] : [];
  const defaultCity = ad?.city_id ? (cities ?? []).find((c) => c.id === ad.city_id) ?? null : null;

  const sp = await searchParams;
  const step = Math.min(4, Math.max(1, Number(sp.step ?? "1") || 1));

  const done = [
    !!ad,
    (ad?.attributes?.length ?? 0) > 0,
    active,
    verif != null && (verif.status === "pending" || verif.status === "approved"),
  ];

  return (
    <>
      <AccountHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Criar meu anúncio</h1>
          <p className="mt-1 text-sm text-muted">Siga os passos. Você pode voltar e editar quando quiser.</p>
        </div>

        <Stepper step={step} done={done} />

        {/* PASSO 1 — Dados */}
        {step === 1 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-4 font-display text-base font-bold text-ink">Dados do anúncio</h2>
              <AdBasicsForm ad={ad ?? null} defaultCity={defaultCity} next="/meu-anuncio?step=1" cta="Salvar dados" />
            </section>
            {ad && (
              <section className={cardCls}>
                <h2 className="font-display text-base font-bold text-ink">Fotos e vídeos</h2>
                <p className="mb-4 mt-0.5 text-xs text-muted">Seu plano ({planLimits.name}): até {planLimits.maxPhotos} fotos e {planLimits.maxVideos} vídeo(s). A 1ª foto vira a capa.</p>
                <MediaManager adId={ad.id} userId={user.id} initial={media} maxPhotos={planLimits.maxPhotos} maxVideos={planLimits.maxVideos} />
              </section>
            )}
            <StepNav step={1} canNext={!!ad} nextHref="/meu-anuncio?step=2" />
          </div>
        )}

        {/* PASSO 2 — Características */}
        {step === 2 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-1 font-display text-base font-bold text-ink">Características e serviços</h2>
              <p className="mb-4 text-xs text-muted">Marque o que você oferece — vira filtro pra quem procura.</p>
              {ad ? (
                <AdAttributesForm ad={ad ?? null} next="/meu-anuncio?step=2" cta="Salvar características" />
              ) : (
                <p className="text-sm text-muted">Primeiro salve os <Link href="/meu-anuncio?step=1" className="text-accent underline">dados do anúncio</Link>.</p>
              )}
            </section>
            <StepNav step={2} canNext={!!ad} nextHref="/meu-anuncio?step=3" />
          </div>
        )}

        {/* PASSO 3 — Plano */}
        {step === 3 && (
          <div className="space-y-6">
            {active && (
              <section className="flex flex-wrap items-center gap-3 rounded-card border border-[#1f6b3f] bg-[#0f2a1b] p-4 text-[#7ee2a8]">
                <div>
                  <p className="font-semibold">Plano {planLimits.name} ativo</p>
                  <p className="text-xs opacity-90">{sub?.method === "pix" ? "Pix" : "Cartão"} — até {new Date(sub!.current_period_end!).toLocaleDateString("pt-BR")}. Seu anúncio fica visível.</p>
                </div>
                {sub?.method === "card" && sub?.stripe_customer_id && <div className="ml-auto"><BillingButton /></div>}
              </section>
            )}
            {!active && <p className="text-sm text-muted">Escolha um plano pra deixar seu anúncio visível na vitrine.</p>}
            <PlanCards currentSlug={active ? plan?.slug : undefined} />
            <StepNav step={3} canNext={true} nextHref="/meu-anuncio?step=4" />
          </div>
        )}

        {/* PASSO 4 — Comprovações */}
        {step === 4 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-1 font-display text-base font-bold text-ink">Comprovação (anti-fake)</h2>
              <VerificationUploader
                userId={user.id}
                status={(verif?.status as string | undefined) ?? null}
                hasDoc={!!verif?.doc_path}
                hasVideo={!!verif?.video_path}
              />
            </section>
            <StepNav step={4} canNext={false} nextHref="#" />
          </div>
        )}
      </main>
    </>
  );
}
