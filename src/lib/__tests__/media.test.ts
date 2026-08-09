import { expect, test } from "vitest";
import { kindOfMime, validateFile, remaining } from "../media";

test("kindOfMime", () => {
  expect(kindOfMime("image/png")).toBe("photo");
  expect(kindOfMime("video/mp4")).toBe("video");
  expect(kindOfMime("application/pdf")).toBeNull();
});

test("validateFile: tipo e tamanho", () => {
  expect(validateFile({ type: "image/jpeg", size: 1_000_000 })).toEqual({ ok: true, kind: "photo" });
  expect(validateFile({ type: "video/webm", size: 1_000_000 })).toEqual({ ok: true, kind: "video" });
  expect(validateFile({ type: "text/plain", size: 10 }).ok).toBe(false);
  expect(validateFile({ type: "image/png", size: 20 * 1024 * 1024 }).ok).toBe(false);
  expect(validateFile({ type: "video/mp4", size: 200 * 1024 * 1024 }).ok).toBe(false);
});

test("remaining por plano/tipo", () => {
  expect(remaining("photo", 6, 1, 2, 0)).toBe(4);
  expect(remaining("video", 6, 1, 0, 1)).toBe(0);
  expect(remaining("photo", 12, 3, 12, 0)).toBe(0);
});
