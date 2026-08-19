import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import AdForm from "../perfil/ad-form";
import AdActions from "../perfil/ad-actions";
import MediaManager from "@/components/MediaManager";
import StoryManager from "@/components/StoryManager";
import BillingButton from "@/components/BillingButton";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

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
          <form action="/logout" method="post">
            <button className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">Sair</button>
          </form>
        </nav>
      </div>
    </header>
  );
}

function Step({ n, title, subtitle, children }: { n: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className={cardCls}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent">{n}</span>
        <div>
          <h2 className="font-display text-base font-bold leading-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default async function MeuAnuncioPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio");

  const admin = createAdminClient();
  await admin.from("profiles").update({ role: "anunciante" }).eq("id", user.id).eq("role", "comum");

  const [{ data: ad }, { data: cities }, { data: profile }, { data: sub }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
    admin.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    admin.from("subscriptions").select("status, method, current_period_end, stripe_customer_id, plans ( slug, allows_story )").eq("profile_id", user.id).maybeSingle(),
  ]);

  const plan = sub?.plans as unknown as { slug?: string; allows_story?: boolean } | null;
  const active = isActive(sub as { status: string; current_period_end: string | null } | null, new Date());
  const allowsStory = active && (plan?.allows_story ?? false);

  const media = ad
    ? (await admin.from("ad_media").select("id, type, storage_path, is_cover").eq("ad_id", ad.id).order("position")).data ?? []
    : [];

  let hasStory = false;
  if (ad) {
    const { data: st } = await admin.from("stories").select("id").eq("ad_id", ad.id).gt("expires_at", new Date().toISOString()).maybeSingle();
    hasStory = !!st;
  }

  const cityName = ad?.city_id ? (cities ?? []).find((c) => c.id === ad.city_id)?.name ?? "" : "";
  const videoCount = media.filter((m: any) => m.type === "video").length;
  const preview: ProfileCardData | null = ad
    ? {
        id: ad.id, name: (profile?.name?.trim() || ad.title) as string, age: (ad.age ?? 0) as number,
        city: cityName, description: (ad.description ?? "") as string, verified: !!ad.verified,
        videoCount, hasVideo: videoCount > 0 || hasStory, recordedAt: null,
        featured: active && plan?.slug === "premium", hue: hueFromId(ad.id),
      }
    : null;

  const published = !!ad;

  return (
    <>
      <AccountHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Meu anúncio</h1>
          <p className="mt-1 text-sm text-muted">Preencha, adicione fotos e escolha um plano para aparecer na vitrine.</p>
        </div>

        {/* Status */}
        <div className={`mb-6 flex items-center gap-3 rounded-card border px-4 py-3 text-sm ${active ? "border-[#1f6b3f] bg-[#0f2a1b] text-[#7ee2a8]" : "border-accent/40 bg-accent-soft text-accent"}`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? "bg-[#164a2c]" : "bg-accent/20"}`}>
            {active ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /></svg>
            )}
          </span>
          <div>
            <p className="font-semibold">{active ? "Seu anúncio está no ar" : published ? "Falta um plano para publicar" : "Comece criando seu anúncio"}</p>
            <p className="text-xs opacity-80">{active ? "Aparece na vitrine e nas buscas." : "Preencha os dados abaixo e assine um plano no final."}</p>
          </div>
          {published && (
            <Link href={`/anuncio/${ad.id}`} className="ml-auto shrink-0 rounded-pill border border-current px-3 py-1.5 text-xs font-semibold">Ver página</Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Coluna principal */}
          <div className="space-y-6">
            <Step n={1} title="Dados do anúncio" subtitle="Nome, idade, preço, cidade, descrição e características.">
              <AdForm ad={ad ?? null} cities={cities ?? []} />
            </Step>

            {ad && (
              <Step n={2} title="Fotos e vídeos" subtitle="Até 12 fotos e 3 vídeos. A 1ª foto vira a capa.">
                <MediaManager adId={ad.id} userId={user.id} initial={media} />
              </Step>
            )}

            {ad && allowsStory && (
              <Step n={3} title="Story 24h" subtitle="Vídeo curto que aparece com play no seu card por 24h.">
                <StoryManager adId={ad.id} userId={user.id} hasStory={hasStory} />
              </Step>
            )}

            {ad && (
              <Step n={allowsStory ? 4 : 3} title="Destaque e disponibilidade" subtitle="Suba pro topo e marque quando está disponível.">
                <AdActions ad={ad} />
              </Step>
            )}
          </div>

          {/* Prévia */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Prévia do seu card</p>
            {preview ? (
              <div className="max-w-[260px]">
                <ProfileCard p={preview} hrefBase="/anuncio" />
              </div>
            ) : (
              <div className="flex aspect-[3/4] max-w-[260px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 p-4 text-center text-xs text-muted">
                Preencha os dados pra ver a prévia do seu card aqui.
              </div>
            )}
          </aside>
        </div>

        {/* PLANO — no final */}
        <section className="mt-6 rounded-card border border-accent/30 bg-gradient-to-b from-accent-soft/60 to-surface p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">Plano</h2>
          {active ? (
            <>
              <p className="mt-1 text-sm text-muted">Plano ativo ({sub?.method === "pix" ? "Pix" : "Cartão"}) até {new Date(sub!.current_period_end!).toLocaleDateString("pt-BR")}. Seu anúncio está visível.</p>
              {sub?.method === "card" && sub?.stripe_customer_id && <div className="mt-3"><BillingButton /></div>}
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Escolha um plano para deixar seu anúncio visível na vitrine.</p>
              <Link href="/planos" className="mt-4 inline-flex rounded-input bg-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">Ver planos e assinar</Link>
            </>
          )}
        </section>
      </main>
    </>
  );
}
