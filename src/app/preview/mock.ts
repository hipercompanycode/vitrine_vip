// Dados fictícios do preview (sem backend). Compartilhado por home e detalhe.
import type { AdCardData } from "@/components/AdCard";

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

export function getPreviewAds(): AdCardData[] {
  return [
    {
      id: "1",
      title: "Eletricista 24h",
      description:
        "Instalações, reparos e emergências. Atendimento rápido em toda a região, com orçamento sem compromisso. Troca de disjuntores, fiação, tomadas, chuveiros e quadros de energia.",
      price_cents: 12000,
      is_available: true,
      created_at: isoMinutesAgo(6),
      city: { name: "São Paulo", uf: "SP" },
      whatsapp: "5511999990001",
      like_count: 12,
    },
    {
      id: "2",
      title: "Manicure e Pedicure em domicílio",
      description:
        "Alongamento, esmaltação em gel e spa dos pés no conforto da sua casa. Materiais esterilizados e horários flexíveis, inclusive fins de semana.",
      price_cents: 8000,
      is_available: true,
      created_at: isoMinutesAgo(28),
      city: { name: "Guarulhos", uf: "SP" },
      whatsapp: "5511999990002",
      like_count: 5,
    },
    {
      id: "3",
      title: "Diarista / Faxina completa",
      description:
        "Limpeza pesada, passar roupa e organização. Referências comprovadas, produtos inclusos e atendimento para residências e escritórios.",
      price_cents: 15000,
      is_available: true,
      created_at: isoMinutesAgo(52),
      city: { name: "Osasco", uf: "SP" },
      whatsapp: "5511999990003",
      like_count: 30,
    },
    {
      id: "4",
      title: "Aulas de violão para iniciantes",
      description:
        "Professor com 10 anos de experiência. Primeira aula grátis. Método prático, do zero ao primeiro solo, presencial ou online.",
      price_cents: 6000,
      is_available: false,
      created_at: isoMinutesAgo(120),
      city: { name: "Campinas", uf: "SP" },
      whatsapp: "5519999990004",
      like_count: 0,
    },
    {
      id: "5",
      title: "Encanador — vazamentos e desentupimento",
      description:
        "Caça-vazamento sem quebra-quebra, troca de registros e reparos hidráulicos. Desentupimento de pias, ralos e vasos com equipamento próprio.",
      price_cents: 18000,
      is_available: true,
      created_at: isoMinutesAgo(180),
      city: { name: "Santo André", uf: "SP" },
      whatsapp: "5511999990005",
      like_count: 8,
    },
    {
      id: "6",
      title: "Cabeleireiro e barbearia",
      description:
        "Corte, barba, luzes e progressiva. Agende seu horário pelo WhatsApp. Atendimento masculino e feminino com produtos profissionais.",
      price_cents: 5000,
      is_available: false,
      created_at: isoMinutesAgo(60 * 6),
      city: { name: "São Paulo", uf: "SP" },
      whatsapp: "5511999990006",
      like_count: 3,
    },
    {
      id: "7",
      title: "Personal Trainer",
      description:
        "Treinos personalizados presenciais ou online. Avaliação física inclusa, acompanhamento de evolução e planos para todos os níveis.",
      price_cents: 20000,
      is_available: true,
      created_at: isoMinutesAgo(60 * 20),
      city: { name: "Niterói", uf: "RJ" },
      whatsapp: "5521999990007",
      like_count: 21,
    },
    {
      id: "8",
      title: "Fotógrafo para eventos",
      description:
        "Casamentos, aniversários e ensaios. Pacotes a partir de 2h de cobertura, entrega das fotos editadas em alta resolução.",
      price_cents: 45000,
      is_available: false,
      created_at: isoMinutesAgo(60 * 30),
      city: { name: "Rio de Janeiro", uf: "RJ" },
      whatsapp: "5521999990008",
      like_count: 1,
    },
    {
      id: "9",
      title: "Jardinagem e paisagismo",
      description:
        "Poda, corte de grama, manutenção de jardins e projetos de paisagismo. Atendimento para casas, condomínios e empresas.",
      price_cents: 9000,
      is_available: true,
      created_at: isoMinutesAgo(60 * 46),
      city: { name: "Curitiba", uf: "PR" },
      whatsapp: "5541999990009",
      like_count: 14,
    },
  ];
}

export function findPreviewAd(id: string): AdCardData | undefined {
  return getPreviewAds().find((a) => a.id === id);
}
