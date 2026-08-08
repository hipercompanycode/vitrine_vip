export function formatBRL(cents: number): string {
  const reais = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${reais}`;
}

export function timeAgo(date: Date, now: Date): string {
  const secs = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (secs < 60) return "agora";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}
