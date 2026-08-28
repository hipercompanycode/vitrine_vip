// Idade / maioridade a partir da data de nascimento autodeclarada.
// birthdate vem do Postgres como string 'YYYY-MM-DD'.

export function ageFrom(birthdate: string | null | undefined, now: Date = new Date()): number | null {
  if (!birthdate) return null;
  const d = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// 18+ de verdade. Sem data (ou inválida) => false (tratado como menor).
export function isAdult(birthdate: string | null | undefined, now: Date = new Date()): boolean {
  const a = ageFrom(birthdate, now);
  return a != null && a >= 18;
}

// Validação de data de nascimento plausível (>=18 e <120 anos). Retorna erro em PT ou null.
export function birthdateError(birthdate: string, now: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return "Informe uma data de nascimento válida.";
  const age = ageFrom(birthdate, now);
  if (age == null) return "Informe uma data de nascimento válida.";
  if (age < 18) return "Você precisa ter 18 anos ou mais.";
  if (age > 120) return "Informe uma data de nascimento válida.";
  return null;
}
