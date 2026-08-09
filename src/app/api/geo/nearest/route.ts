import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_AGE = 60 * 60 * 24 * 180; // ~180 dias

// Aceita só número finito dentro do intervalo válido; null/"" /NaN/Infinity/fora do range → inválido.
function toCoord(raw: string | null, min: number, max: number): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const lat = toCoord(sp.get("lat"), -90, 90);
  const lng = toCoord(sp.get("lng"), -180, 180);
  if (lat === null || lng === null) {
    return NextResponse.json({ error: "lat/lng inválidos" }, { status: 400 });
  }

  // Nota de privacidade: lat/lng não são persistidos em lugar nenhum, só usados
  // para resolver a cidade mais próxima via RPC.
  const admin = createAdminClient();
  const { data: id } = await admin.rpc("nearest_city_id", { p_lat: lat, p_lng: lng });
  if (id == null) return NextResponse.json({ error: "cidade não encontrada" }, { status: 404 });

  const { data: city } = await admin.from("cities").select("id, name, uf").eq("id", id).maybeSingle();

  const res = NextResponse.json({ city });
  res.cookies.set("city_id", String(id), { path: "/", maxAge: MAX_AGE });
  return res;
}
