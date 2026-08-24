export type SubStatus = "active" | "past_due" | "canceled" | "expired";
export type SubRow = { status: string; current_period_end: string | null };

const DAY_MS = 86_400_000;

export function isActive(sub: SubRow | null, now: Date): boolean {
  if (!sub || sub.status !== "active" || !sub.current_period_end) return false;
  return new Date(sub.current_period_end).getTime() > now.getTime();
}

export function pixPeriodEndISO(now: Date, days = 30): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

// Renovação: soma o período à data de fim atual se ela ainda estiver no futuro,
// senão parte de agora. Assim pagar antes de vencer empilha os dias.
export function extendPeriodISO(currentEnd: string | null, now: Date, days = 30): string {
  const base = currentEnd && new Date(currentEnd).getTime() > now.getTime()
    ? new Date(currentEnd).getTime()
    : now.getTime();
  return new Date(base + days * DAY_MS).toISOString();
}

export function mapStripeStatus(s: string): SubStatus {
  switch (s) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "expired";
  }
}
