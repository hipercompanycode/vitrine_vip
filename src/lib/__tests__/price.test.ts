import { expect, test } from "vitest";
import { parsePriceToCents } from "../price";

test("formato BR: vírgula decimal, ponto milhar", () => {
  expect(parsePriceToCents("150,00")).toBe(15000);
  expect(parsePriceToCents("1.500,00")).toBe(150000);
  expect(parsePriceToCents("1.234.567,89")).toBe(123456789);
  expect(parsePriceToCents("150")).toBe(15000);
  expect(parsePriceToCents("150,5")).toBe(15050);
});

test("vazio → 0 (preço opcional)", () => {
  expect(parsePriceToCents("")).toBe(0);
  expect(parsePriceToCents("   ")).toBe(0);
});

test("negativo → clampa em 0", () => {
  expect(parsePriceToCents("-5")).toBe(0);
});

test("inválido → null", () => {
  expect(parsePriceToCents("abc")).toBeNull();
  expect(parsePriceToCents("R$ x")).toBeNull();
});
