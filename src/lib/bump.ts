export function nextBumpAt(lastBumpedAt: Date | null, cooldownMinutes: number): Date | null {
  if (lastBumpedAt === null || cooldownMinutes <= 0) return null;
  return new Date(lastBumpedAt.getTime() + cooldownMinutes * 60_000);
}

export function canBump(lastBumpedAt: Date | null, cooldownMinutes: number, now: Date): boolean {
  const next = nextBumpAt(lastBumpedAt, cooldownMinutes);
  if (next === null) return true;
  return now.getTime() >= next.getTime();
}
