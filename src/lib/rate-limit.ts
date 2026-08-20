// Rate limit simples em memória (janela fixa). Suficiente pré-lançamento.
// Obs.: em serverless o estado é por instância — para escala real, trocar por Redis/Upstash.
type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // limpeza oportunista para não crescer sem limite
  if (store.size > 5000) {
    for (const [k, b] of store) if (now >= b.reset) store.delete(k);
  }

  const b = store.get(key);
  if (!b || now >= b.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

export function clientKey(request: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const xff = request.headers.get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}
