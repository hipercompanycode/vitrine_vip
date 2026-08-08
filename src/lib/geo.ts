export type Coord = { lat: number; lng: number };

const R = 6371; // raio da Terra em km
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCity<T extends Coord>(point: Coord, cities: T[]): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const c of cities) {
    const d = haversineKm(point, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
