import { expect, test } from "vitest";
import { isAdmin } from "../admin";

test("isAdmin compara e-mail case-insensitive", () => {
  expect(isAdmin("Me@Ex.com", "me@ex.com")).toBe(true);
  expect(isAdmin("  me@ex.com ", "me@ex.com")).toBe(true);
  expect(isAdmin("other@ex.com", "me@ex.com")).toBe(false);
});

test("isAdmin falso quando falta e-mail ou config", () => {
  expect(isAdmin(null, "me@ex.com")).toBe(false);
  expect(isAdmin("me@ex.com", null)).toBe(false);
  expect(isAdmin("me@ex.com", "")).toBe(false);
  expect(isAdmin(undefined, undefined)).toBe(false);
});
