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

// Registra o último geo do anunciante. Regras (país nulo = dev/local, ignorado):
//  - país ≠ BR (ou mudou de país) => FORÇA reverificação (sinal forte de handoff).
//  - se veio a UF do anúncio (adUf) e o país é BR: UF diferente => só um FLAG pro
//    admin (não pausa — evita travar quem viaja / IP roteado torto); UF igual limpa
//    o flag antigo.
export async function recordGeoAndFlag(admin: SupabaseClient, profileId: string, geo: Geo, adUf?: string | null): Promise<void> {
  const now = new Date().toISOString();
  const { data: prof } = await admin.from("profiles").select("last_country").eq("id", profileId).maybeSingle();
  const prev = (prof?.last_country as string | null) ?? null;

  const patch: Record<string, unknown> = { last_country: geo.country, last_ip: geo.ip, last_seen: now };
  if (adUf && geo.country === "BR" && geo.region) {
    if (geo.region !== adUf) {
      patch.geo_flag = `Acesso de ${geo.region}${geo.city ? ` (${geo.city})` : ""} ≠ anúncio ${adUf}`;
      patch.geo_flag_at = now;
    } else {
      patch.geo_flag = null;
      patch.geo_flag_at = null;
    }
  }
  await admin.from("profiles").update(patch).eq("id", profileId);

  if (geo.country && geo.country !== "BR") {
    await forceReverify(admin, profileId, `acesso de fora do Brasil (${geo.country})`);
  } else if (geo.country && prev && geo.country !== prev) {
    await forceReverify(admin, profileId, `acesso de país diferente (${prev} → ${geo.country})`);
  }
}
