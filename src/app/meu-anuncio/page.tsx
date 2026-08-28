import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import { PLANS, planBySlug, type PlanSlug } from "@/lib/plans";
import { AdBasicsForm, AdAttributesForm, AdPricesForm } from "../perfil/ad-form";
import MediaManager from "@/components/MediaManager";
import { VIDEO_ENABLED } from "@/lib/media";
import { availableActive } from "@/lib/ads";
import PlanCards from "@/components/PlanCards";
import VerificationUploader from "@/components/VerificationUploader";
import AdActions from "../perfil/ad-actions";
import WizardSubmit from "@/components/WizardSubmit";
import WizardNav from "@/components/WizardNav";
import ReferralShare from "@/components/ReferralShare";
import { ensureRefCode } from "@/lib/referral";
import PixCheckout from "@/components/PixCheckout";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";

const STEPS = ["Dados", "Preços", VIDEO_ENABLED ? "Fotos e vídeos" : "Fotos", "Características", "Plano", "Comprovações"];
const N = STEPS.length;

function AccountHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-baseline gap-0.5">
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/seguranca" className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>
            <span className="hidden sm:inline">Segurança</span>
          </Link>
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
          <WizardSubmit formId={formId} className={NEXT_CLS} />
        ) : (
          <WizardNav href={`/meu-anuncio?step=${step + 1}`} label="Próximo →" className={NEXT_CLS} />
        )
      ) : (
        <WizardNav href="/meu-anuncio" label="Concluir" className={NEXT_CLS} />
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

  const [{ data: ad }, { data: sub }, { data: verif }, { data: prof }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("subscriptions").select("status, method, current_period_end, plans ( slug, allows_story )").eq("profile_id", user.id).maybeSingle(),
    admin.from("verifications").select("status, doc_path, face_path, body_path, feedback, reverify_reason").eq("profile_id", user.id).maybeSingle(),
    admin.from("profiles").select("whatsapp, ref_code, referred_by").eq("id", user.id).maybeSingle(),
  ]);

  // só a cidade selecionada (não carrega as 5,5k cidades)
  const defaultCity = ad?.city_id
    ? (await admin.from("cities").select("id,name,uf").eq("id", ad.city_id).maybeSingle()).data
    : null;

  const plan = sub?.plans as unknown as { slug?: string; allows_story?: boolean } | null;
  const active = isActive(sub as { status: string; current_period_end: string | null } | null, new Date());
  const isTrial = active && (sub?.method as string | undefined) === "trial";
  const isCortesia = (sub?.method as string | undefined) === "cortesia";

  // indicação: garante o código do anunciante + conta quem ele indicou + quem o indicou
  const refCode = ((prof?.ref_code as string | null) ?? (await ensureRefCode(admin, user.id))) ?? "";
  const [{ count: refCount }, refByRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
    prof?.referred_by
      ? admin.from("ads").select("title").eq("profile_id", prof.referred_by as string).maybeSingle()
      : Promise.resolve({ data: null as { title?: string } | null }),
  ]);
  const referralCount = refCount ?? 0;
  const referredByName = ((refByRes.data as { title?: string } | null)?.title ?? "").trim() || null;
  const trialEndLabel = sub?.current_period_end ? new Date(sub.current_period_end as string).toLocaleDateString("pt-BR") : "";
  const planLimits = plan?.slug && PLANS.some((x) => x.slug === plan.slug) ? planBySlug(plan.slug as PlanSlug) : PLANS[0];
  const verifStatus = (verif?.status as string | undefined) ?? null;
  const verifApproved = verifStatus === "approved";
  const verifRejected = verifStatus === "rejected";
  const verifReverify = verifStatus === "reverify"; // precisa refazer a selfie (30d/gatilho)
  const verifReason = (verif?.reverify_reason as string | null) ?? null;
  const verifFeedback = (verif?.feedback as string | null) ?? null;
  const verifSubmitted = verif != null && !verifReverify; // envio válido (pending|approved|rejected)
  const visible = active && verifApproved;

  const media = ad ? (await admin.from("ad_media").select("id, type, storage_path, is_cover, review").eq("ad_id", ad.id).order("position")).data ?? [] : [];

  const sp = await searchParams;
  const step = Math.min(N, Math.max(1, Number(sp.step ?? "1") || 1));

  const done = [
    !!ad,
    (ad?.price_table?.length ?? 0) > 0,
    media.length > 0,
    (ad?.attributes?.length ?? 0) > 0,
    active,
    verifSubmitted,
  ];

  // Painel aparece quando o anúncio está funcional (dados + plano ativo + comprovação enviada).
  // Preços, fotos e características são opcionais — não travam a gestão.
  const complete = !!ad && active && verifSubmitted;
  const editing = sp.step != null;
  const showPanel = !!ad && complete && !editing;
  const paused = (ad?.status ?? "active") !== "active";

  // Paywall: aprovado mas sem assinatura ativa (trial/pago venceu) → precisa pagar.
  // Bloqueia gerenciar/editar o anúncio; /perfil (excluir conta) segue livre pela LGPD.
  const needsPayment = !!ad && verifApproved && !active;
  if (needsPayment && ad) {
    const hadPeriod = !!sub?.current_period_end;
    return (
      <>
        <AccountHeader />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Ative seu anúncio</h1>
            <p className="mt-1 truncate text-sm text-muted">{(ad.title as string) || "Seu anúncio"}</p>
          </div>

          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 10V8a6 6 0 1 1 12 0v2m-9 0h6a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{hadPeriod ? "Seu período acabou" : "Falta pagar para aparecer"}</p>
              <p className="text-xs text-muted">Seu perfil está aprovado, mas só volta à vitrine — e libera o gerenciamento — após o pagamento.</p>
            </div>
          </div>

          <section className={cardCls}>
            <PixCheckout plans={PLANS} redirectTo="/meu-anuncio" />
          </section>

          <p className="mt-4 text-center text-xs text-muted">
            Precisa sair? <Link href="/perfil" className="text-accent underline-offset-2 hover:underline">Meu perfil / excluir conta</Link>
          </p>
        </main>
      </>
    );
  }

  if (showPanel && ad) {
    return (
      <>
        <AccountHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Meu anúncio</h1>
            <p className="mt-1 truncate text-sm text-muted">{(ad.title as string) || "Seu anúncio"}</p>
          </div>

          {verifApproved ? (
            <div className="space-y-5">
              {/* status atual */}
              <div className={`flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card ring-1 ${paused ? "ring-transparent" : "ring-[#43d17f]/15"}`}>
                {paused ? (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" /></svg>
                    </span>
                    <p className="text-sm font-semibold text-ink">Anúncio pausado — não aparece na vitrine.</p>
                  </>
                ) : (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">Seu anúncio está no ar 🎉</p>
                      <p className="text-xs text-muted">{isTrial ? `Teste grátis — termina em ${trialEndLabel}. Assine para continuar depois.` : "Perfil verificado e visível na vitrine."}</p>
                    </div>
                    <span className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-bold ${isTrial ? "bg-accent-soft text-accent" : "bg-[#12331f] text-[#43d17f]"}`}>
                      <span className={`dot-live h-1.5 w-1.5 rounded-full ${isTrial ? "bg-accent" : "bg-[#43d17f]"}`} />{isTrial ? "Teste grátis" : "No ar"}
                    </span>
                  </>
                )}
              </div>

              {/* métricas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-card border border-line bg-surface px-4 py-3 text-center shadow-card">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Visualizações</div>
                  <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{(ad.views as number | null) ?? 0}</div>
                </div>
                <div className="rounded-card border border-line bg-surface px-4 py-3 text-center shadow-card">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Subidas ao topo</div>
                  <div className="mt-0.5 font-display text-2xl font-extrabold text-accent">{(ad.bump_count as number | null) ?? 0}</div>
                  {ad.bumped_at ? (
                    <div className="mt-0.5 text-[10px] text-muted">última: {new Date(ad.bumped_at as string).toLocaleDateString("pt-BR")}</div>
                  ) : null}
                </div>
              </div>

              {!paused && (
                <a
                  href={`/anuncio/${ad.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  Ver meu anúncio público
                </a>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Link href="/meu-anuncio?step=3" className="flex items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" /></svg>
                  Editar fotos
                </Link>
                <Link href="/meu-anuncio?step=1" className="flex items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" /></svg>
                  Alterar cidade
                </Link>
              </div>

              <Link href="/seguranca" className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-bold text-ink">Segurança — clientes</span>
                  <span className="block text-xs text-muted">Consulte um número antes de atender ou relate um cliente</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>

              {refCode && <ReferralShare code={refCode} count={referralCount} referredBy={referredByName} />}

              <section className={cardCls}>
                <h2 className="mb-4 font-display text-base font-bold text-ink">Ações do anúncio</h2>
                <AdActions ad={{ id: ad.id as string, is_available: availableActive(ad.is_available as boolean, (ad.available_since as string | null) ?? null, Date.now()), bumped_at: (ad.bumped_at as string | null) ?? null, status: (ad.status as string) ?? "active" }} cooldownMinutes={planLimits.bumpCooldownMinutes} />
              </section>
            </div>
          ) : (
            <div className="space-y-5">
              {verifRejected ? (
                /* recusado + motivo */
                <section className="rounded-card border border-red-500/40 bg-red-500/10 p-6 text-center">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <h2 className="font-display text-lg font-bold text-ink">Comprovação recusada</h2>
                  <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                    Sua verificação não foi aprovada. Corrija o que foi apontado e reenvie para entrar no ar.
                  </p>
                  {verifFeedback && (
                    <div className="mx-auto mt-4 max-w-sm rounded-card border border-red-500/30 bg-surface/70 px-4 py-3 text-left">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-red-300">Motivo da recusa</span>
                      <p className="whitespace-pre-line text-sm text-ink">{verifFeedback}</p>
                    </div>
                  )}
                </section>
              ) : (
                /* aguardando aprovação */
                <section className="rounded-card border border-accent/40 bg-accent-soft p-6 text-center">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h2 className="font-display text-lg font-bold text-ink">Anúncio aguardando aprovação</h2>
                  <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                    Suas comprovações estão em análise. Assim que a moderação aprovar, seu anúncio entra no ar automaticamente. Você já pode editá-lo enquanto isso.
                  </p>
                </section>
              )}

              <Link
                href={verifRejected ? "/meu-anuncio?step=6" : "/meu-anuncio?step=1"}
                className={`flex w-full items-center justify-center gap-2 rounded-input py-2.5 text-sm font-semibold transition-colors ${verifRejected ? "bg-accent text-white hover:bg-accent-strong" : "border border-line bg-surface text-ink hover:border-accent hover:text-accent"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {verifRejected ? "Reenviar comprovação" : "Editar anúncio"}
              </Link>
            </div>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <AccountHeader />
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${step === 5 ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="mb-5">
          {complete && (
            <Link href="/meu-anuncio" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Voltar ao painel
            </Link>
          )}
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{complete ? "Editar meu anúncio" : "Criar meu anúncio"}</h1>
          <p className="mt-1 text-sm text-muted">Todos os perfis são validados — 100% anti-fake. Você só aparece após aprovar as comprovações.</p>
        </div>

        {/* status de visibilidade (oculto no passo 5, onde já há o banner do plano) */}
        {step !== 5 && (
          <div className={`mb-6 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card ring-1 ${visible ? "ring-[#43d17f]/15" : "ring-accent/15"}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${visible ? "bg-[#12331f] text-[#43d17f]" : "bg-accent-soft text-accent"}`}>
              {visible ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>
            <p className="text-sm font-semibold text-ink">
              {visible ? "Seu anúncio está no ar." : !active ? "Falta assinar um plano (passo 5)." : verifReverify ? "Reverificação necessária — refaça a selfie no passo 6." : verifRejected ? "Comprovação recusada — reenvie no passo 6." : !verifSubmitted ? "Falta enviar as comprovações (passo 6)." : "Comprovações em análise — você aparece assim que aprovarmos."}
            </p>
            {visible && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#12331f] px-2.5 py-1 text-[11px] font-bold text-[#43d17f]">
                <span className="dot-live h-1.5 w-1.5 rounded-full bg-[#43d17f]" />No ar
              </span>
            )}
          </div>
        )}

        {verifReverify && step !== 6 && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-semibold text-amber-200">🔐 Reverificação de segurança necessária</p>
            <p className="mt-1 text-sm text-amber-100/80">
              Pra garantir que é você mesma operando o perfil (anti-golpe/anti-revenda), refaça a selfie com o novo código.
              {verifReason && <> Motivo: <strong className="text-amber-100">{verifReason}</strong>.</>} Seu anúncio fica pausado até refazer.
            </p>
            <Link href="/meu-anuncio?step=6" className="mt-3 inline-flex rounded-pill bg-amber-500 px-4 py-2 text-sm font-bold text-[#231a06] transition-colors hover:bg-amber-400">Refazer selfie agora</Link>
          </div>
        )}

        <Stepper step={step} done={done} />

        {/* 1 — Dados */}
        {step === 1 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-4 font-display text-base font-bold text-ink">Dados do anúncio</h2>
              <AdBasicsForm ad={ad ?? null} defaultCity={defaultCity} defaultWhatsapp={(prof?.whatsapp as string | null) ?? ""} defaultContact={{ whatsapp: ad?.contact_whatsapp ?? true, call: ad?.contact_call ?? false, telegram: ad?.contact_telegram ?? false }} next="/meu-anuncio?step=2" />
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

        {/* 3 — Fotos (vídeo desligado até upgrade) */}
        {step === 3 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="font-display text-base font-bold text-ink">{VIDEO_ENABLED ? "Fotos e vídeos" : "Fotos"}</h2>
              <p className="mb-4 mt-0.5 text-xs text-muted">
                {VIDEO_ENABLED
                  ? `Seu plano (${planLimits.name}): até ${planLimits.maxPhotos} fotos e ${planLimits.maxVideos} vídeo(s). A 1ª foto vira a capa.`
                  : `Seu plano (${planLimits.name}): até ${planLimits.maxPhotos} fotos. A 1ª foto vira a capa.`}
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
            {active && isTrial && (
              <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card ring-1 ring-accent/20">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S9 3 6.5 4.5 8 7 12 7zM12 7s3-4 5.5-2.5S16 7 12 7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                </span>
                <div>
                  <p className="font-semibold text-ink">Teste grátis de 7 dias ativo 🎁</p>
                  <p className="text-xs text-muted">Seu anúncio fica no ar até {trialEndLabel}. Depois, assine um plano para continuar.</p>
                </div>
              </section>
            )}
            {active && !isTrial && (
              <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card ring-1 ring-[#43d17f]/15">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 16l-2-9 5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 2h14v2H5v-2z" /></svg>
                </span>
                <div>
                  <p className="font-semibold text-ink">{isCortesia ? "Acesso vitalício 🎁" : `Plano ${planLimits.name} ativo`}</p>
                  <p className="text-xs text-muted">{isCortesia ? "Cortesia — não expira. Aproveite!" : `Pix — até ${new Date(sub!.current_period_end!).toLocaleDateString("pt-BR")}.`}</p>
                </div>
              </section>
            )}
            {!active && <p className="text-sm text-muted">Comece com <strong className="text-ink">7 dias grátis</strong> ou já assine um plano — você escolhe.</p>}
            {isTrial && <p className="text-sm text-muted">Quer garantir depois do teste? Assine agora:</p>}
            <PlanCards currentSlug={active && !isTrial ? plan?.slug : undefined} trialHref={!active ? "/meu-anuncio?step=6" : undefined} />
            <StepNav step={5} />
          </div>
        )}

        {/* 6 — Comprovações (obrigatório) */}
        {step === 6 && (
          <div className="space-y-6">
            <section className={cardCls}>
              <h2 className="mb-1 font-display text-base font-bold text-ink">Comprovação (obrigatória)</h2>
              <p className="mb-4 text-xs text-muted">Anti-fake: seu perfil <strong className="text-ink">só aparece após validação</strong>. Envie o documento, a selfie segurando o papel com o código e uma foto de corpo com o rosto visível — privados, só a moderação vê.</p>
              <VerificationUploader
                userId={user.id}
                status={verifStatus}
                hasDoc={verifReverify ? false : !!verif?.doc_path}
                hasFace={verifReverify ? false : !!verif?.face_path}
                hasBody={verifReverify ? false : !!verif?.body_path}
                feedback={verifFeedback}
                reverifyReason={verifReason}
              />
            </section>
            <StepNav step={6} />
          </div>
        )}
      </main>
    </>
  );
}
