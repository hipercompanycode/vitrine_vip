import { expect, test } from "vitest";
import { isActive, pixPeriodEndISO, extendPeriodISO } from "../subscription";

const now = new Date("2026-08-09T12:00:00Z");

test("isActive: ativa só com status active e período no futuro", () => {
  expect(isActive({ status: "active", current_period_end: "2026-08-10T12:00:00Z" }, now)).toBe(true);
  expect(isActive({ status: "active", current_period_end: "2026-08-08T12:00:00Z" }, now)).toBe(false);
  expect(isActive({ status: "past_due", current_period_end: "2026-09-01T00:00:00Z" }, now)).toBe(false);
  expect(isActive({ status: "active", current_period_end: null }, now)).toBe(false);
  expect(isActive(null, now)).toBe(false);
});

test("pixPeriodEndISO: soma 30 dias por padrão", () => {
  expect(pixPeriodEndISO(now)).toBe("2026-09-08T12:00:00.000Z");
  expect(pixPeriodEndISO(now, 7)).toBe("2026-08-16T12:00:00.000Z");
});

test("extendPeriodISO: empilha nos dias restantes se ainda no futuro", () => {
  // renova antes de vencer → soma 30 dias ao fim atual
  expect(extendPeriodISO("2026-08-20T12:00:00Z", now)).toBe("2026-09-19T12:00:00.000Z");
});

test("extendPeriodISO: parte de agora se já venceu ou não há período", () => {
  expect(extendPeriodISO("2026-08-01T12:00:00Z", now)).toBe("2026-09-08T12:00:00.000Z");
  expect(extendPeriodISO(null, now)).toBe("2026-09-08T12:00:00.000Z");
});

