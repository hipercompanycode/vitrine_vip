import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import AdForm from "./ad-form";
import AdActions from "./ad-actions";
import MediaManager from "@/components/MediaManager";
import StoryManager from "@/components/StoryManager";
import BillingButton from "@/components/BillingButton";
import { inputCls, labelCls, cardCls, btnSecondary } from "@/components/ui";

export default async function PerfilPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const admin = createAdminClient();
  // Clicar em "Anunciar" transforma o perfil em anunciante (promove só quem é comum).
  await admin.from("profiles").update({ role: "anunciante" }).eq("id", user.id).eq("role", "comum");
  const [{ data: ad }, { data: cities }, { data: profile }, { data: sub }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
    admin.from("profiles").select("name,whatsapp").eq("id", user.id).maybeSingle(),
    admin
      .from("subscriptions")
      .select("status, method, current_period_end, stripe_customer_id, plans ( allows_story )")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  // Assinatura já buscada acima (única por profile_id) — reutilizada para o CTA
  // "ver planos", para liberar o Story 24h e para a seção "Assinatura" abaixo.
  const active = isActive(sub as { status: string; current_period_end: string | null } | null, new Date());
  const allowsStory = active && ((sub?.plans as unknown as { allows_story: boolean } | null)?.allows_story ?? false);

  const media = ad
    ? (await admin.from("ad_media").select("id, type, storage_path, is_cover").eq("ad_id", ad.id).order("position")).data ?? []
    : [];

  let hasStory = false;
  if (ad) {
    const { data: st } = await admin.from("stories").select("id").eq("ad_id", ad.id).gt("expires_at", new Date().toISOString()).maybeSingle();
    hasStory = !!st;
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">serviços</span>
            <span className="h-2 w-2 rounded-full bg-accent" />
          </Link>
          <form action="/logout" method="post">
            <button className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Meu painel
          </h1>
          <p className="mt-1 text-sm text-muted">Gerencie seu contato e seu anúncio.</p>
        </div>

        {!active && (
          <Link href="/planos" className="block rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-center text-sm font-semibold text-accent">
            Seu anúncio fica visível com um plano ativo — ver planos
          </Link>
        )}

        <section className={cardCls}>
          <h2 className="font-display text-base font-bold text-ink">Assinatura</h2>
          {active ? (
            <p className="mt-1 text-sm text-muted">
              Ativa ({sub?.method === "pix" ? "Pix" : "Cartão"}) até {new Date(sub!.current_period_end!).toLocaleDateString("pt-BR")}.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Sem assinatura ativa. <a href="/planos" className="text-accent underline">Ver planos</a>.
            </p>
          )}
          {sub?.method === "card" && sub?.stripe_customer_id && (
            <div className="mt-3">
              <BillingButton />
            </div>
          )}
        </section>

        <section className={cardCls}>
          <h2 className="font-display text-base font-bold text-ink">Seu contato</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted">
            O WhatsApp aparece no botão de contato do seu anúncio.
          </p>
          <form action="/api/profile" method="post" className="space-y-3">
            <label className="block">
              <span className={labelCls}>Seu nome</span>
              <input name="name" defaultValue={profile?.name ?? ""} placeholder="Como você quer ser chamado" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>WhatsApp</span>
              <input
                name="whatsapp"
                defaultValue={profile?.whatsapp ?? ""}
                placeholder="5511999999999 (com DDD e país)"
                inputMode="numeric"
                className={inputCls}
              />
            </label>
            <button className={btnSecondary}>Salvar contato</button>
          </form>
        </section>

        <section className={cardCls}>
          <h2 className="mb-4 font-display text-base font-bold text-ink">Seu anúncio</h2>
          <AdForm ad={ad ?? null} cities={cities ?? []} />
        </section>

        {ad ? (
          <section className={cardCls}>
            <h2 className="mb-4 font-display text-base font-bold text-ink">Ações do anúncio</h2>
            <AdActions ad={ad} />
          </section>
        ) : (
          <p className="px-1 text-center text-xs text-muted">
            Publique seu anúncio acima para liberar as ações de destaque e disponibilidade.
          </p>
        )}

        {ad && (
          <section className={cardCls}>
            <h2 className="mb-4 font-display text-base font-bold text-ink">Fotos e vídeos</h2>
            <MediaManager adId={ad.id} userId={user.id} initial={media} />
          </section>
        )}

        {ad && allowsStory && (
          <section className={cardCls}>
            <h2 className="mb-2 font-display text-base font-bold text-ink">Story 24h</h2>
            <StoryManager adId={ad.id} userId={user.id} hasStory={hasStory} />
          </section>
        )}
      </main>
    </>
  );
}
