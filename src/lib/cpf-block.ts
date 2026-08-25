import { createHmac } from "crypto";

// Hash do CPF pra blocklist. Usa HMAC com o service-role como pepper: o espaço
// de CPF é pequeno (11 dígitos), então um SHA puro seria quebrável por força
// bruta. Assim guardamos só o hash dos banidos (LGPD: não retém CPF cru deles).
export function hashCpf(cpfDigits: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "vitrinevip-cpf-pepper";
  return createHmac("sha256", secret).update(cpfDigits).digest("hex");
}
