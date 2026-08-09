import { NextResponse } from "next/server";

const MAX_AGE = 60 * 60 * 24 * 180; // ~180 dias

export async function POST(request: Request) {
  const form = await request.formData();
  const keep = String(form.get("keep") ?? "") === "1";
  const cityIdRaw = String(form.get("city_id") ?? "").trim();
  const nearby = String(form.get("nearby") ?? "1") === "0" ? "0" : "1";

  // city_id precisa ser inteiro positivo antes de ir para o cookie; "" ou "0" = limpar.
  let cityId: number | null = null;
  if (!keep && cityIdRaw !== "" && cityIdRaw !== "0") {
    const parsed = Number(cityIdRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "city_id inválido" }, { status: 400 });
    }
    cityId = parsed;
  }

  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  if (!keep) {
    if (cityId === null) res.cookies.set("city_id", "", { maxAge: 0, path: "/" });
    else res.cookies.set("city_id", String(cityId), { path: "/", maxAge: MAX_AGE });
  }
  res.cookies.set("nearby", nearby, { path: "/", maxAge: MAX_AGE });
  return res;
}
