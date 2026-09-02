import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import AudioRecorder from "@/components/AudioRecorder";
import { isAdult } from "@/lib/age";
import { planForProfile } from "@/lib/access";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Áudio de voz", robots: { index: false, follow: false } };

export default async function AudioPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/audio");

  const admin = createAdminClient();
  const [{ data: ad }, { data: prof }, plan] = await Promise.all([
    admin.from("ads").select("id, audio_path").eq("profile_id", user.id).maybeSingle(),
    admin.from("profiles").select("birthdate").eq("id", user.id).maybeSingle(),
    planForProfile(admin, user.id),
  ]);
  if (!ad) redirect("/meu-anuncio");
  if (!isAdult((prof?.birthdate as string | null) ?? null)) redirect("/meu-anuncio");
  const allowsAudio = plan.allowsAudio;

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

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <div className="mb-6 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-accent-soft/60 via-surface to-surface p-7 text-center shadow-card">
          <span className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-pop">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Áudio de voz</h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">Grave um “oi” rapidinho. O cliente ouve sua voz direto no anúncio — dá mais confiança e destaca seu perfil.</p>
        </div>

        <section className={cardCls}>
          {allowsAudio ? (
            <AudioRecorder adId={ad.id as string} userId={user.id} initialPath={(ad.audio_path as string | null) ?? null} />
          ) : (
            <div className="text-center">
              <p className="text-sm text-ink">O <strong>áudio de apresentação</strong> é um recurso dos planos <strong className="text-accent">Pro</strong> e <strong className="text-accent">Premium</strong>.</p>
              <p className="mt-1 text-xs text-muted">Assine ou faça upgrade pra gravar sua voz no anúncio.</p>
              <Link href="/planos" className="mt-4 inline-flex rounded-input bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong">Ver planos</Link>
            </div>
          )}
        </section>

        <Link href="/meu-anuncio" className="mt-4 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Voltar ao meu anúncio
        </Link>
      </main>
    </>
  );
}
