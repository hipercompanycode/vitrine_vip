import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";
import AdForm from "../perfil/ad-form";
import AdActions from "../perfil/ad-actions";
import MediaManager from "@/components/MediaManager";
import StoryManager from "@/components/StoryManager";
import BillingButton from "@/components/BillingButton";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";

function AccountHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
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

export default async function MeuAnuncioPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio");

  const admin = createAdminClient();
  // "Anunciar" transforma o perfil em anunciante (promove só quem é comum).
  await admin.from("profiles").update({ role: "anunciante" }).eq("id", user.id).eq("role", "comum");

  const [{ data: ad }, { data: cities }, { data: sub }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
    admin.from("subscriptions").select("status, method, current_period_end, stripe_customer_id, plans ( allows_story )").eq("profile_id", user.id).maybeSingle(),
  ]);

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
      <AccountHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Meu anúncio</h1>
          <p className="mt-1 text-sm text-muted">Preencha os dados, adicione fotos/vídeos e escolha um plano para publicar.</p>
        </div>

        {!active && (
          <div className="rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent">
            Seu anúncio só fica visível com um <strong>plano ativo</strong>. Escolha um no final da página.
          </div>
        )}

        <section className={cardCls}>
          <h2 className="mb-4 font-display text-base font-bold text-ink">Dados do anúncio</h2>
          <AdForm ad={ad ?? null} cities={cities ?? []} />
        </section>

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

        {ad ? (
          <section className={cardCls}>
            <h2 className="mb-4 font-display text-base font-bold text-ink">Destaque e disponibilidade</h2>
            <AdActions ad={ad} />
          </section>
        ) : (
          <p className="px-1 text-center text-xs text-muted">Publique os dados acima para liberar destaque e disponibilidade.</p>
        )}

        {/* PLANO — no final */}
        <section className="rounded-card border border-accent/30 bg-gradient-to-b from-accent-soft/60 to-surface p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">Plano</h2>
          {active ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Plano ativo ({sub?.method === "pix" ? "Pix" : "Cartão"}) até {new Date(sub!.current_period_end!).toLocaleDateString("pt-BR")}. Seu anúncio está visível.
              </p>
              {sub?.method === "card" && sub?.stripe_customer_id && <div className="mt-3"><BillingButton /></div>}
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Escolha um plano para deixar seu anúncio visível na vitrine.</p>
              <Link href="/planos" className="mt-4 inline-flex rounded-input bg-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">
                Ver planos e assinar
              </Link>
            </>
          )}
        </section>
      </main>
    </>
  );
}
