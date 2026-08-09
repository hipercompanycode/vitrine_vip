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
