export function nextBumpAt(lastBumpedAt: Date | null, cooldownMinutes: number): Date | null {
  if (lastBumpedAt === null || cooldownMinutes <= 0) return null;
  return new Date(lastBumpedAt.getTime() + cooldownMinutes * 60_000);
}

export function canBump(lastBumpedAt: Date | null, cooldownMinutes: number, now: Date): boolean {
  const next = nextBumpAt(lastBumpedAt, cooldownMinutes);
  if (next === null) return true;
  return now.getTime() >= next.getTime();
}

// Faixa de "quando subiu" para agrupar a listagem:
// < 5 min -> hora atual (ex.: "10h"); 5–15 de 5 em 5; 15–60 de 15 em 15; depois hora cheia.
export function bumpBucket(minutes: number, now: Date): { key: string; label: string; order: number } {
  if (minutes < 5) {
    return { key: "now", label: `${now.getHours()}h`, order: -1 };
  }
  if (minutes < 15) {
    const m = Math.min(15, Math.ceil(minutes / 5) * 5);
    return { key: `m${m}`, label: `Faz ${m} min`, order: m };
  }
  if (minutes < 60) {
    const m = Math.ceil(minutes / 15) * 15;
    if (m >= 60) return { key: "h1", label: "Faz 1 hora", order: 60 };
    return { key: `m${m}`, label: `Faz ${m} min`, order: m };
  }
  const h = Math.floor(minutes / 60);
  return { key: `h${h}`, label: `Faz ${h} ${h === 1 ? "hora" : "horas"}`, order: h * 60 };
}
