import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import StoryManager from "@/components/StoryManager";
import { isAdult } from "@/lib/age";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Story 24h", robots: { index: false, follow: false } };

export default async function StoryPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/story");

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const [{ data: ad }, { data: prof }, { data: sub }] = await Promise.all([
    admin.from("ads").select("id").eq("profile_id", user.id).maybeSingle(),
    admin.from("profiles").select("birthdate").eq("id", user.id).maybeSingle(),
    admin.from("subscriptions").select("plans ( allows_story )").eq("profile_id", user.id).eq("status", "active").gt("current_period_end", nowIso).maybeSingle(),
  ]);
  if (!ad) redirect("/meu-anuncio");
  if (!isAdult((prof?.birthdate as string | null) ?? null)) redirect("/meu-anuncio");

  const allowsStory = (sub?.plans as unknown as { allows_story: boolean } | null)?.allows_story ?? false;
  const { data: story } = await admin.from("stories").select("id").eq("ad_id", ad.id).gt("expires_at", nowIso).maybeSingle();

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
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Story 24h</h1>
            <p className="text-sm text-muted">Um vídeo curto que fica na capa do seu anúncio por 24 horas.</p>
          </div>
        </div>

        <section className={cardCls}>
          {allowsStory ? (
            <StoryManager adId={ad.id as string} userId={user.id} hasStory={!!story} />
          ) : (
            <div className="text-center">
              <p className="text-sm text-ink">O <strong>Story</strong> é um recurso dos planos <strong className="text-accent">Pro</strong> e <strong className="text-accent">Premium</strong>.</p>
              <p className="mt-1 text-xs text-muted">Assine ou faça upgrade pra ativar o story do seu anúncio.</p>
              <Link href="/planos" className="mt-4 inline-flex rounded-input bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong">Ver planos</Link>
            </div>
          )}
        </section>

        <Link href="/meu-anuncio" className="mt-5 flex w-full items-center justify-center gap-2 rounded-input bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent-strong">
          Concluir
        </Link>
      </main>
    </>
  );
}
