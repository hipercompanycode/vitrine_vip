// TEMPORÁRIO — preview do painel do anunciante com dados fake (sem auth/Supabase).
// Reusa AdForm e AdActions reais. Os botões apontam para as rotas reais (só visual aqui).
import Link from "next/link";
import { AdBasicsForm } from "../../perfil/ad-form";
import AdActions from "../../perfil/ad-actions";
import PreviewNav from "@/components/PreviewNav";
import { inputCls, labelCls, cardCls, btnSecondary } from "@/components/ui";

export const dynamic = "force-dynamic";

const CITIES = [
  { id: 1, name: "São Paulo", uf: "SP" },
  { id: 2, name: "Guarulhos", uf: "SP" },
  { id: 3, name: "Osasco", uf: "SP" },
  { id: 4, name: "Campinas", uf: "SP" },
  { id: 5, name: "Santo André", uf: "SP" },
];

const MOCK_AD = {
  title: "Eletricista 24h",
  description:
    "Instalações, reparos e emergências. Atendimento rápido em toda a região, orçamento sem compromisso.",
  price_cents: 12000,
  city_id: 1,
};

const MOCK_PROFILE = { name: "Carlos Silva", whatsapp: "5511999990001" };

export default function PreviewPainelPage() {
  return (
    <>
      <PreviewNav active="painel" />
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/preview" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">serviços</span>
            <span className="h-2 w-2 rounded-full bg-accent" />
          </Link>
          <span className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted">Sair</span>
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
              <input name="name" defaultValue={MOCK_PROFILE.name} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>WhatsApp</span>
              <input name="whatsapp" defaultValue={MOCK_PROFILE.whatsapp} inputMode="numeric" className={inputCls} />
            </label>
            <button className={btnSecondary}>Salvar contato</button>
          </form>
        </section>

        <section className={cardCls}>
          <h2 className="mb-4 font-display text-base font-bold text-ink">Seu anúncio</h2>
          <AdBasicsForm ad={MOCK_AD} defaultCity={{ id: 1, name: "São Paulo", uf: "SP" }} next="/preview/painel" />
        </section>

        <section className={cardCls}>
          <h2 className="mb-4 font-display text-base font-bold text-ink">Ações do anúncio</h2>
          <AdActions ad={{ id: "mock", is_available: true, bumped_at: null }} />
        </section>
      </main>
    </>
  );
}
