// Mock neutro p/ o layout de vitrine (sem backend). Textos genéricos, fotos = placeholder.
import type { ProfileCardData } from "@/components/ProfileCard";

export function getVitrineProfiles(): ProfileCardData[] {
  return [
    { id: "1", name: "Manuela", age: 23, city: "Indaiatuba", description: "Atendimento tranquilo e agradável, ambiente reservado.", verified: true, videoCount: 3, hasVideo: true, recordedAt: "13:07", featured: true, hue: 330, ratio: "tall" },
    { id: "2", name: "Lindhara", age: 35, city: "Indaiatuba", description: "Massoterapeuta, sessão relaxante e cuidadosa.", verified: false, featured: true, hue: 285, ratio: "portrait" },
    { id: "3", name: "Bianca", age: 30, city: "Indaiatuba", description: "Massagem relaxante, atendimento pontual.", verified: true, videoCount: 3, hue: 20, ratio: "square" },
    { id: "4", name: "Aline", age: 20, city: "Indaiatuba", description: "Novidade na cidade, atendimento discreto.", verified: false, hue: 200, ratio: "portrait" },
    { id: "5", name: "Rafaela", age: 32, city: "Jundiaí", description: "Bailarina, boa conversa e simpatia.", verified: true, videoCount: 3, priceLabel: "R$ 400", hue: 45, ratio: "tall" },
    { id: "6", name: "Tatiane", age: 31, city: "Indaiatuba", description: "Massagem relaxante, ambiente climatizado.", verified: true, videoCount: 3, priceLabel: "R$ 200", hue: 260, ratio: "portrait" },
    { id: "7", name: "Morena", age: 26, city: "Indaiatuba", description: "Novidade, atendimento caprichado.", verified: true, priceLabel: "R$ 200", hasVideo: true, recordedAt: "13:24", hue: 350, ratio: "square" },
    { id: "8", name: "Priscila", age: 22, city: "Indaiatuba", description: "Sem frescura, de volta à cidade.", verified: false, hue: 15, ratio: "portrait" },
    { id: "9", name: "Camila", age: 40, city: "Indaiatuba", description: "Ótimas recomendações, atendimento premium.", verified: true, videoCount: 2, hasAudio: true, hasVideo: true, recordedAt: "12:44", hue: 300, ratio: "tall" },
    { id: "10", name: "Mylla", age: 32, city: "Indaiatuba", description: "Atendimento caloroso e cheio de energia.", verified: true, videoCount: 4, featured: true, hue: 190, ratio: "tall" },
    { id: "11", name: "Vitória", age: 40, city: "Indaiatuba", description: "Chego segunda, poucos dias — vem me conhecer.", verified: false, hue: 275, ratio: "portrait" },
    { id: "12", name: "Sabrina", age: 28, city: "Indaiatuba", description: "Em despedida da cidade, aproveite enquanto dá.", verified: true, videoCount: 3, hasVideo: true, recordedAt: "07:11", hue: 340, ratio: "square" },
    { id: "13", name: "Letícia", age: 21, city: "Indaiatuba", description: "Toda natural, venha me ver de perto.", verified: true, hue: 55, ratio: "portrait" },
    { id: "14", name: "Amanda", age: 25, city: "Indaiatuba", description: "Realizo suas fantasias com carinho.", verified: true, videoCount: 2, hasAudio: true, hue: 10, ratio: "tall" },
    { id: "15", name: "Deborah", age: 33, city: "Indaiatuba", description: "Voltei, amores — venha relaxar comigo.", verified: true, featured: true, hue: 220, ratio: "portrait" },
    { id: "16", name: "Adrielli", age: 45, city: "Indaiatuba", description: "Para homem de bom gosto, atendimento fino.", verified: false, hue: 295, ratio: "square" },
    { id: "17", name: "Júlia", age: 23, city: "Indaiatuba", description: "Novinha animada, de volta à cidade.", verified: true, hue: 325, ratio: "tall" },
    { id: "18", name: "Fernanda", age: 27, city: "Indaiatuba", description: "Simpática e caprichosa, ambiente aconchegante.", verified: true, videoCount: 1, hue: 165, ratio: "portrait" },
  ];
}

export const VITRINE_TIME_BUCKETS = [
  "5 Minutos",
  "15 Minutos",
  "25 Minutos",
  "35 Minutos",
  "45 Minutos",
  "1 Hora",
];
