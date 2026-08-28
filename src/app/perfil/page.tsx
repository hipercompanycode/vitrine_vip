import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { inputCls, labelCls, cardCls, btnSecondary } from "@/components/ui";
import { userHasAd } from "@/lib/ads";
import DeleteAccount from "@/components/DeleteAccount";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("name, whatsapp").eq("id", user.id).maybeSingle();
  const initial = (profile?.name?.trim() || user.email || "?").charAt(0).toUpperCase();
  const hasAd = await userHasAd(admin, user.id);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
            <span className="h-2 w-2 rounded-full bg-accent" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/meu-anuncio" className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_var(--accent)] transition-all hover:bg-accent-strong active:scale-95">
              {hasAd ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  Meu anúncio
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  Anunciar
                </>
              )}
            </Link>
            <form action="/logout" method="post" className="shrink-0">
              <button aria-label="Sair" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 12H3m0 0l4-4m-4 4l4 4M10 5V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 space-y-6">
        {/* hero */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-2xl font-black text-accent">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold tracking-tight text-ink">
              {profile?.name?.trim() || "Meu perfil"}
            </h1>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>

        {/* dados */}
        <section className={cardCls}>
          <h2 className="font-display text-base font-bold text-ink">Seus dados</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted">Nome da sua conta — fica <strong className="text-ink">privado</strong>, não aparece na vitrine. O nome público você define no seu anúncio (passo 1).</p>
          <form action="/api/profile" method="post" className="space-y-3">
            <label className="block">
              <span className={labelCls}>Seu nome (privado)</span>
              <input name="name" defaultValue={profile?.name ?? ""} placeholder="Seu nome" className={inputCls} />
            </label>
            <button className={btnSecondary}>Salvar</button>
          </form>
        </section>

        <DeleteAccount />
      </main>
    </>
  );
}
