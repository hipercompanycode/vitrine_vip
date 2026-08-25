import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { accountAccess } from "@/lib/access";
import { apiError, GENERIC_ERROR } from "@/lib/http";
import { geoFromRequest, recordGeoAndFlag } from "@/lib/geo-ip";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { available } = await request.json().catch(() => ({ available: false }));
  const value = available === true;

  const admin = createAdminClient();
  const { active } = await accountAccess(admin, user.id);
  if (!active) return apiError("Sua assinatura está inativa. Renove para usar esta ação.", 402);

  const { error } = await admin
    .from("ads")
    .update({ is_available: value, available_since: value ? new Date().toISOString() : null })
    .eq("profile_id", user.id);
  if (error) return apiError(GENERIC_ERROR, 500, error);

  // sinal de geo por IP (UF do acesso × UF do anúncio) — só ao LIGAR "disponível agora"
  if (value) {
    try {
      const { data: adCity } = await admin.from("ads").select("cities ( uf )").eq("profile_id", user.id).maybeSingle();
      const uf = ((Array.isArray(adCity?.cities) ? adCity?.cities[0] : adCity?.cities) as { uf?: string } | null)?.uf ?? null;
      await recordGeoAndFlag(admin, user.id, geoFromRequest(request), uf);
    } catch (e) { console.error("geo availability:", e); }
  }

  return NextResponse.json({ ok: true, is_available: value });
}
