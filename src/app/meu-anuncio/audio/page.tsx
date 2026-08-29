import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import AudioRecorder from "@/components/AudioRecorder";
import { isAdult } from "@/lib/age";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Áudio de voz", robots: { index: false, follow: false } };

export default async function AudioPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/meu-anuncio/audio");

  const admin = createAdminClient();
  const [{ data: ad }, { data: prof }] = await Promise.all([
    admin.from("ads").select("id, audio_path").eq("profile_id", user.id).maybeSingle(),
    admin.from("profiles").select("birthdate").eq("id", user.id).maybeSingle(),
  ]);
  if (!ad) redirect("/meu-anuncio");
  if (!isAdult((prof?.birthdate as string | null) ?? null)) redirect("/meu-anuncio");

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Áudio de voz</h1>
            <p className="text-sm text-muted">Grave um oi rapidinho — o cliente ouve sua voz no anúncio.</p>
          </div>
        </div>

        <section className={cardCls}>
          <AudioRecorder adId={ad.id as string} userId={user.id} initialPath={(ad.audio_path as string | null) ?? null} />
        </section>

        <Link href="/meu-anuncio" className="mt-5 flex w-full items-center justify-center gap-2 rounded-input bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent-strong">
          Concluir
        </Link>
      </main>
    </>
  );
}
