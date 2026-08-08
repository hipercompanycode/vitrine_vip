import { expect, test } from "vitest";
import { canBump, nextBumpAt } from "../bump";

const now = new Date("2026-08-08T12:00:00Z");

test("nunca subiu → pode subir", () => {
  expect(canBump(null, 60, now)).toBe(true);
  expect(nextBumpAt(null, 60)).toBeNull();
});

test("cooldown 0 (premium) → sempre pode", () => {
  expect(canBump(new Date("2026-08-08T11:59:59Z"), 0, now)).toBe(true);
});

test("dentro do cooldown → não pode", () => {
  const last = new Date("2026-08-08T11:30:00Z"); // 30 min atrás
  expect(canBump(last, 60, now)).toBe(false);
});

test("fora do cooldown → pode", () => {
  const last = new Date("2026-08-08T10:30:00Z"); // 90 min atrás
  expect(canBump(last, 60, now)).toBe(true);
});

test("nextBumpAt = last + cooldown", () => {
  const last = new Date("2026-08-08T11:30:00Z");
  expect(nextBumpAt(last, 60)?.toISOString()).toBe("2026-08-08T12:30:00.000Z");
});
