import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { inputCls, labelCls, cardCls, btnSecondary } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("name, whatsapp").eq("id", user.id).maybeSingle();
  const initial = (profile?.name?.trim() || user.email || "?").charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine</span>
            <span className="h-2 w-2 rounded-full bg-accent" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/meu-anuncio" className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-95">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              Anunciar
            </Link>
            <form action="/logout" method="post">
              <button className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">Sair</button>
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
          <p className="mb-4 mt-0.5 text-xs text-muted">O WhatsApp aparece no botão de contato do seu anúncio.</p>
          <form action="/api/profile" method="post" className="space-y-3">
            <label className="block">
              <span className={labelCls}>Seu nome</span>
              <input name="name" defaultValue={profile?.name ?? ""} placeholder="Como você quer aparecer" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>WhatsApp</span>
              <input name="whatsapp" defaultValue={profile?.whatsapp ?? ""} placeholder="5511999999999 (com DDD e país)" inputMode="numeric" className={inputCls} />
            </label>
            <button className={btnSecondary}>Salvar</button>
          </form>
        </section>
      </main>
    </>
  );
}
