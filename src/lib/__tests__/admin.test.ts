import { expect, test } from "vitest";
import { isAdmin, isAdminUser } from "../admin";

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

test("isAdminUser exige e-mail confirmado e igual", () => {
  expect(isAdminUser({ email: "me@ex.com", email_confirmed_at: "2020-01-01T00:00:00Z" }, "me@ex.com")).toBe(true);
  expect(isAdminUser({ email: "me@ex.com", email_confirmed_at: null }, "me@ex.com")).toBe(false);
  expect(isAdminUser({ email: "other@ex.com", email_confirmed_at: "2020-01-01T00:00:00Z" }, "me@ex.com")).toBe(false);
  expect(isAdminUser(null, "me@ex.com")).toBe(false);
});
