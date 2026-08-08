import { expect, test } from "vitest";
import { haversineKm, nearestCity } from "../geo";

test("haversine SP↔RJ ~360km", () => {
  const sp = { lat: -23.5505, lng: -46.6333 };
  const rj = { lat: -22.9068, lng: -43.1729 };
  const d = haversineKm(sp, rj);
  expect(d).toBeGreaterThan(340);
  expect(d).toBeLessThan(380);
});

test("mesmo ponto = 0", () => {
  expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBeCloseTo(0);
});

test("nearestCity escolhe a mais próxima", () => {
  const cities = [
    { id: 1, lat: -23.55, lng: -46.63 }, // SP
    { id: 2, lat: -22.90, lng: -43.17 }, // RJ
  ];
  const perto_de_sp = { lat: -23.6, lng: -46.6 };
  expect(nearestCity(perto_de_sp, cities)?.id).toBe(1);
});
