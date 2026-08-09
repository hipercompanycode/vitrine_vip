import { expect, test } from "vitest";
import { publicUrl } from "../storage";

test("publicUrl monta URL pública do Storage", () => {
  expect(publicUrl("https://x.supabase.co", "ad-media", "u1/a1/f.jpg"))
    .toBe("https://x.supabase.co/storage/v1/object/public/ad-media/u1/a1/f.jpg");
});

test("publicUrl remove barra final da base", () => {
  expect(publicUrl("https://x.supabase.co/", "ad-media", "a.png"))
    .toBe("https://x.supabase.co/storage/v1/object/public/ad-media/a.png");
});
