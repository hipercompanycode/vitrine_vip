import { expect, test } from "vitest";
import { formatBRL, timeAgo } from "../format";

test("formatBRL formata centavos em reais", () => {
  expect(formatBRL(3990)).toBe("R$ 39,90");
  expect(formatBRL(99900)).toBe("R$ 999,00");
  expect(formatBRL(0)).toBe("R$ 0,00");
});

test("timeAgo em pt-BR", () => {
  const now = new Date("2026-08-08T12:00:00Z");
  expect(timeAgo(new Date("2026-08-08T11:59:30Z"), now)).toBe("agora");
  expect(timeAgo(new Date("2026-08-08T11:30:00Z"), now)).toBe("há 30 min");
  expect(timeAgo(new Date("2026-08-08T10:00:00Z"), now)).toBe("há 2 h");
  expect(timeAgo(new Date("2026-08-06T12:00:00Z"), now)).toBe("há 2 d");
});
