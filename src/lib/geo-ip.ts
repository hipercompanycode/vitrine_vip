import type { SupabaseClient } from "@supabase/supabase-js";
import { forceReverify } from "@/lib/reverify";

// Geolocalização por IP (headers que a Vercel injeta). É SÓ SINAL — VPN fura;
// serve pra flagrar operação vindo de outro país, não pra bloquear sozinho.
export type Geo = { ip: string | null; country: string | null; region: string | null; city: string | null };

export function geoFromRequest(request: Request): Geo {
  const h = request.headers;
  const ip = (h.get("x-forwarded-for")?.split(",")[0]?.trim()) || h.get("x-real-ip") || null;
  return {
    ip,
    country: h.get("x-vercel-ip-country"),
    region: h.get("x-vercel-ip-country-region"),
    city: h.get("x-vercel-ip-city"),
  };
}

// Registra o último geo do anunciante e, se o PAÍS mudou (sinal de handoff/revenda),
// força a reverificação. País nulo (dev/local) é ignorado.
export async function recordGeoAndFlag(admin: SupabaseClient, profileId: string, geo: Geo): Promise<void> {
  const { data: prof } = await admin.from("profiles").select("last_country").eq("id", profileId).maybeSingle();
  const prev = (prof?.last_country as string | null) ?? null;
  await admin.from("profiles").update({
    last_country: geo.country, last_ip: geo.ip, last_seen: new Date().toISOString(),
  }).eq("id", profileId);
  if (geo.country && prev && geo.country !== prev) {
    await forceReverify(admin, profileId, `acesso de país diferente (${prev} → ${geo.country})`);
  }
}
