import { expect, test } from "vitest";
import { sanitizeTags, tagLabel, isValidReason, reasonLabel } from "../interactions";

test("sanitizeTags: mantém válidos, remove inválidos e duplicados", () => {
  expect(sanitizeTags(["igual_foto", "x", "recomendo", "igual_foto"])).toEqual(["igual_foto", "recomendo"]);
  expect(sanitizeTags([])).toEqual([]);
  expect(sanitizeTags(["nada"])).toEqual([]);
});

test("tagLabel traduz selo", () => {
  expect(tagLabel("nao_fake")).toBe("Não é fake");
  expect(tagLabel("desconhecido")).toBe("desconhecido");
});

test("isValidReason", () => {
  expect(isValidReason("fake")).toBe(true);
  expect(isValidReason("golpe")).toBe(true);
  expect(isValidReason("outro")).toBe(true);
  expect(isValidReason("nope")).toBe(false);
});

test("reasonLabel traduz motivo", () => {
  expect(reasonLabel("golpe")).toBe("Golpe");
  expect(reasonLabel("zzz")).toBe("zzz");
});
