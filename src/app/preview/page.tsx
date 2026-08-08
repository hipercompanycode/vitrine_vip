// TEMPORÁRIO — preview visual com dados fake (sem Supabase). Espelha a home real.
// Remover antes de finalizar.
import AdCard, { type AdCardData } from "@/components/AdCard";
import SiteHeader from "@/components/SiteHeader";
import HomeFilters from "@/components/HomeFilters";

export const dynamic = "force-dynamic";

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

const MOCK: AdCardData[] = [
  {
    id: "1",
    title: "Eletricista 24h",
    description: "Instalações, reparos e emergências. Atendimento rápido em toda a região.",
    price_cents: 12000,
    is_available: true,
    created_at: isoMinutesAgo(8),
    city: { name: "São Paulo", uf: "SP" },
    whatsapp: "5511999990001",
  },
  {
    id: "2",
    title: "Manicure e Pedicure em domicílio",
    description: "Alongamento, esmaltação em gel e spa dos pés no conforto da sua casa.",
    price_cents: 8000,
    is_available: true,
    created_at: isoMinutesAgo(45),
    city: { name: "Guarulhos", uf: "SP" },
    whatsapp: "5511999990002",
  },
  {
    id: "3",
    title: "Aulas de violão para iniciantes",
    description: "Professor com 10 anos de experiência. Primeira aula grátis.",
    price_cents: 6000,
    is_available: false,
    created_at: isoMinutesAgo(180),
    city: { name: "Campinas", uf: "SP" },
    whatsapp: "5519999990003",
  },
  {
    id: "4",
    title: "Diarista / Faxina completa",
    description: "Limpeza pesada, passar roupa e organização. Referências comprovadas.",
    price_cents: 15000,
    is_available: true,
    created_at: isoMinutesAgo(60 * 5),
    city: { name: "Osasco", uf: "SP" },
    whatsapp: "5511999990004",
  },
  {
    id: "5",
    title: "Personal Trainer",
    description: "Treinos personalizados presenciais ou online. Avaliação física inclusa.",
    price_cents: 20000,
    is_available: false,
    created_at: isoMinutesAgo(60 * 26),
    city: { name: "Santo André", uf: "SP" },
    whatsapp: "5511999990005",
  },
  {
    id: "6",
    title: "Fotógrafo para eventos",
    description: "Casamentos, aniversários e ensaios. Pacotes a partir de 2h de cobertura.",
    price_cents: 45000,
    is_available: true,
    created_at: isoMinutesAgo(60 * 50),
    city: { name: "Rio de Janeiro", uf: "RJ" },
    whatsapp: "5521999990006",
  },
];

export default function PreviewPage() {
  const now = new Date();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        <section className="py-7 sm:py-10">
          <span className="mb-3 inline-block rounded-pill bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
            Preview visual · dados fictícios
          </span>
          <h1 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Serviços perto
            <br className="hidden sm:block" /> de você
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted sm:text-base">
            Encontre quem resolve — ou anuncie o seu. Contato direto, sem intermediário.
          </p>
          <div className="mt-5 sm:mt-6">
            <HomeFilters />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Anúncios recentes</h2>
            <span className="text-xs text-muted">{MOCK.length} resultados</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK.map((ad, i) => (
              <AdCard key={ad.id} ad={ad} now={now} index={i} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
