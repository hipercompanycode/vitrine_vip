// Converte preço digitado (formato BR) em centavos. null = inválido.
export function parsePriceToCents(input: string): number | null {
  const raw = (input ?? "").trim();
  if (raw === "") return 0;
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const reais = Number(normalized);
  if (!Number.isFinite(reais)) return null;
  return Math.max(0, Math.round(reais * 100));
}
