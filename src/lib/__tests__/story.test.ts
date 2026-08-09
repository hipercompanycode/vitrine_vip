import { expect, test } from "vitest";
import { isStoryActive, STORY_MAX_SECONDS } from "../story";

const now = new Date("2026-08-08T12:00:00Z");
test("ativo antes de expirar", () => {
  expect(isStoryActive("2026-08-08T13:00:00Z", now)).toBe(true);
  expect(isStoryActive(new Date("2026-08-08T12:00:01Z"), now)).toBe(true);
});
test("inativo no/após expirar", () => {
  expect(isStoryActive("2026-08-08T12:00:00Z", now)).toBe(false);
  expect(isStoryActive("2026-08-08T11:59:59Z", now)).toBe(false);
});
test("limite 60s", () => { expect(STORY_MAX_SECONDS).toBe(60); });
