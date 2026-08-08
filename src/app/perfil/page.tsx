import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import AdForm from "./ad-form";
import AdActions from "./ad-actions";
import { inputCls, labelCls, cardCls, btnSecondary } from "@/components/ui";

export default async function PerfilPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: ad }, { data: cities }, { data: profile }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
    admin.from("profiles").select("name,whatsapp").eq("id", user.id).maybeSingle(),
  ]);

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
      </main>
    </>
  );
}
