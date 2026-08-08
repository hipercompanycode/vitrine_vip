import { expect, test } from "vitest";
import { canInteract } from "../roles";

test("só comum interage", () => {
  expect(canInteract("comum")).toBe(true);
  expect(canInteract("anunciante")).toBe(false);
  expect(canInteract(null)).toBe(false);
  expect(canInteract(undefined)).toBe(false);
});
