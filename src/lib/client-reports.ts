// Reputação/alerta de cliente por telefone. Pure (cliente + servidor).

export const CLIENT_CATEGORIES = [
  { slug: "golpe", label: "Golpe / calote (não pagou)" },
  { slug: "agressao", label: "Agressão / violência" },
  { slug: "desrespeito", label: "Desrespeito / assédio" },
  { slug: "outro", label: "Outro" },
] as const;

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CLIENT_CATEGORIES.map((c) => [c.slug, c.label])
);

// Categorias graves puxam o alerta pra vermelho já na 1ª ocorrência.
const SEVERE = new Set(["golpe", "agressao"]);

export function isValidCategory(slug: string): boolean {
  return CLIENT_CATEGORIES.some((c) => c.slug === slug);
}

// Normaliza telefone BR: só dígitos, tira DDI 55, guarda os últimos 11 (DDD+nº).
export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d.slice(-11);
}

export function isValidPhone(raw: string): boolean {
  const d = normalizePhone(raw);
  return d.length === 10 || d.length === 11;
}

export function maskPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length < 10) return d;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  const p = rest.length === 9 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : `${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${p}`;
}

export type Level = "vermelho" | "amarelo";

// Nível do alerta a partir dos relatos APROVADOS de um telefone.
export function alertLevel(reports: { category: string }[]): Level {
  if (reports.some((r) => SEVERE.has(r.category)) || reports.length >= 3) return "vermelho";
  return "amarelo";
}
