"use client";

// Cache client-side dos favoritos do usuário. Uma única chamada a /api/favorite/ids
// serve todos os corações da página (dedup). Usado pra marcar o estado inicial em
// páginas cacheadas (cidade/ISR), onde o servidor não sabe quem é o usuário.

let cache: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;
const listeners = new Set<() => void>();

export function getFavoritesCache(): Set<string> | null {
  return cache;
}

export function ensureFavorites(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = fetch("/api/favorite/ids", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((j: { ids?: string[] }) => {
        cache = new Set(j.ids ?? []);
        listeners.forEach((l) => l());
        return cache;
      })
      .catch(() => {
        cache = new Set<string>();
        return cache;
      });
  }
  return loading;
}

export function subscribeFavorites(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Mantém o cache coerente quando o usuário favorita/desfavorita.
export function markFavorite(adId: string, on: boolean): void {
  if (!cache) return;
  if (on) cache.add(adId);
  else cache.delete(adId);
}
