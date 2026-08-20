import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import { PLANS, planBySlug, type PlanSlug } from "@/lib/plans";
import { AdBasicsForm, AdAttributesForm, AdPricesForm } from "../perfil/ad-form";
import MediaManager from "@/components/MediaManager";
import BillingButton from "@/components/BillingButton";
import PlanCards from "@/components/PlanCards";
import VerificationUploader from "@/components/VerificationUploader";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";

const STEPS = ["Dados", "Preços", "Fotos e vídeos", "Características", "Plano", "Comprovações"];
const N = STEPS.length;

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
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-display text-xs font-bold transition-colors ${
                active ? "border-accent bg-accent text-white" : complete ? "border-[#2a7d4f] text-[#43d17f]" : "border-line bg-surface text-muted"
              }`}>
                {complete && !active ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : n}
              </span>
              <span className={`hidden text-[10px] font-semibold sm:block ${active ? "text-ink" : "text-muted"}`}>{label}</span>
            </Link>
            {n < N && <span className={`mx-1.5 h-0.5 flex-1 rounded ${done[i] ? "bg-accent/50" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

const NEXT_CLS = "rounded-input bg-accent px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]";

function StepNav({ step, formId }: { step: number; formId?: string }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      {step > 1 ? (
        <Link href={`/meu-anuncio?step=${step - 1}`} className="rounded-input border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2">← Voltar</Link>
      ) : <span />}
      {step < N ? (
        formId ? (
          <button type="submit" form={formId} className={NEXT_CLS}>Salvar e continuar →</button>
        ) : (
          <Link href={`/meu-anuncio?step=${step + 1}`} className={NEXT_CLS}>Próximo →</Link>
        )
      ) : (
        <Link href="/perfil" className={NEXT_CLS}>Concluir</Link>
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
  const verifApproved = verif?.status === "approved";
  const verifSent = verif != null && (verif.status === "pending" || verif.status === "approved");
  const visible = active && verifApproved;

  const media = ad ? (await admin.from("ad_media").select("id, type, storage_path, is_cover").eq("ad_id", ad.id).order("position")).data ?? [] : [];
  const defaultCity = ad?.city_id ? (cities ?? []).find((c) => c.id === ad.city_id) ?? null : null;

  const sp = await searchParams;
  const step = Math.min(N, Math.max(1, Number(sp.step ?? "1") || 1));

  const done = [
    !!ad,
    (ad?.price_table?.length ?? 0) > 0,
    media.length > 0,
    (ad?.attributes?.length ?? 0) > 0,
    active,
    verifSent,
  ];

  return (
    <>
      <AccountHeader />
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${step === 5 ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Criar meu anúncio</h1>
          <p className="mt-1 text-sm text-muted">Todos os perfis são validados — 100% anti-fake. Você só aparece após aprovar as comprovações.</p>
        </div>

        {/* status de visibilidade */}
        <div className={`mb-6 flex items-center gap-3 rounded-card border px-4 py-3 text-sm ${visible ? "border-[#1f6b3f] bg-[#0f2a1b] text-[#7ee2a8]" : "border-accent/40 bg-accent-soft text-accent"}`}>
          <span className="font-semibold">
            {visible ? "Seu anúncio está no ar." : !active ? "Falta assinar um plano (passo 5)." : !verifSent ? "Falta enviar as comprovações (passo 6)." : "Comprovações em análise — você aparece assim que aprovarmos."}
          </span>
        </div>

        <Stepper step={step} done={done} />

        {/* 1 — Dados */}
        {step === 1 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-4 font-display text-base font-bold text-ink">Dados do anúncio</h2>
              <AdBasicsForm ad={ad ?? null} defaultCity={defaultCity} next="/meu-anuncio?step=2" />
            </section>
            <StepNav step={1} formId="wizard-form" />
          </div>
        )}

        {/* 2 — Preços */}
        {step === 2 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-4 font-display text-base font-bold text-ink">Tabela de preços</h2>
              {ad ? (
                <AdPricesForm ad={ad ?? null} next="/meu-anuncio?step=3" />
              ) : (
                <p className="text-sm text-muted">Salve os <Link href="/meu-anuncio?step=1" className="text-accent underline">dados</Link> primeiro.</p>
              )}
            </section>
            <StepNav step={2} formId={ad ? "wizard-form" : undefined} />
          </div>
        )}

        {/* 3 — Fotos e vídeos */}
        {step === 3 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="font-display text-base font-bold text-ink">Fotos e vídeos</h2>
              <p className="mb-4 mt-0.5 text-xs text-muted">Seu plano ({planLimits.name}): até {planLimits.maxPhotos} fotos e {planLimits.maxVideos} vídeo(s). A 1ª foto vira a capa.</p>
              {ad ? (
                <MediaManager adId={ad.id} userId={user.id} initial={media} maxPhotos={planLimits.maxPhotos} maxVideos={planLimits.maxVideos} />
              ) : (
                <p className="text-sm text-muted">Salve os <Link href="/meu-anuncio?step=1" className="text-accent underline">dados</Link> primeiro.</p>
              )}
            </section>
            <StepNav step={3} />
          </div>
        )}

        {/* 4 — Características */}
        {step === 4 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-1 font-display text-base font-bold text-ink">Características e serviços</h2>
              <p className="mb-4 text-xs text-muted">Marque o que você oferece — vira filtro pra quem procura.</p>
              {ad ? (
                <AdAttributesForm ad={ad ?? null} next="/meu-anuncio?step=5" />
              ) : (
                <p className="text-sm text-muted">Salve os <Link href="/meu-anuncio?step=1" className="text-accent underline">dados</Link> primeiro.</p>
              )}
            </section>
            <StepNav step={4} formId={ad ? "wizard-form" : undefined} />
          </div>
        )}

        {/* 5 — Plano */}
        {step === 5 && (
          <div className="space-y-6">
            {active && (
              <section className="flex flex-wrap items-center gap-3 rounded-card border border-[#1f6b3f] bg-[#0f2a1b] p-4 text-[#7ee2a8]">
                <div>
                  <p className="font-semibold">Plano {planLimits.name} ativo</p>
                  <p className="text-xs opacity-90">{sub?.method === "pix" ? "Pix" : "Cartão"} — até {new Date(sub!.current_period_end!).toLocaleDateString("pt-BR")}.</p>
                </div>
                {sub?.method === "card" && sub?.stripe_customer_id && <div className="ml-auto"><BillingButton /></div>}
              </section>
            )}
            {!active && <p className="text-sm text-muted">Escolha um plano pra deixar seu anúncio visível na vitrine.</p>}
            <PlanCards currentSlug={active ? plan?.slug : undefined} />
            <StepNav step={5} />
          </div>
        )}

        {/* 6 — Comprovações (obrigatório) */}
        {step === 6 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-1 font-display text-base font-bold text-ink">Comprovação (obrigatória)</h2>
              <p className="mb-4 text-xs text-muted">Anti-fake: seu perfil <strong className="text-ink">só aparece após validação</strong>. Envie um documento com foto e um vídeo — privados, só a moderação vê.</p>
              <VerificationUploader
                userId={user.id}
                status={(verif?.status as string | undefined) ?? null}
                hasDoc={!!verif?.doc_path}
                hasVideo={!!verif?.video_path}
              />
            </section>
            <StepNav step={6} />
          </div>
        )}
      </main>
    </>
  );
}
