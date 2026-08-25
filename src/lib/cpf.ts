// Utilidades de CPF (isomórficas: cliente e servidor).

export const onlyDigitsCpf = (s: string) => (s || "").replace(/\D/g, "").slice(0, 11);

export function maskCpf(v: string): string {
  const d = onlyDigitsCpf(v);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)];
  let out = p[0];
  if (d.length > 3) out += "." + p[1];
  if (d.length > 6) out += "." + p[2];
  if (d.length > 9) out += "-" + p[3];
  return out;
}

// Valida CPF pelos dígitos verificadores (não é consulta à Receita, mas barra
// número inventado/inválido).
export function isValidCPF(raw: string): boolean {
  const c = onlyDigitsCpf(raw);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false; // todos iguais (000..., 111...)

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i], 10) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(c[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i], 10) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(c[10], 10);
}
