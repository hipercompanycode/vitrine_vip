import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { canBump, nextBumpAt } from "@/lib/bump";
import { accountAccess, planForProfile } from "@/lib/access";
import { apiError, GENERIC_ERROR } from "@/lib/http";
import { geoFromRequest, recordGeoAndFlag } from "@/lib/geo-ip";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { active } = await accountAccess(admin, user.id);
  if (!active) return apiError("Sua assinatura está inativa. Renove para subir o anúncio.", 402);

  const plan = await planForProfile(admin, user.id);
  if (!plan.allowsBump) return apiError("Subir ao topo é um recurso do plano Pro ou Premium.", 402);

  const { data: ad } = await admin.from("ads").select("id, bumped_at, profile_id, cities ( uf )").eq("profile_id", user.id).maybeSingle();
  if (!ad) return NextResponse.json({ error: "sem anúncio" }, { status: 404 });

  // plano ativo → cooldown
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan_id, status, current_period_end, plans(bump_cooldown_minutes)")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const cooldown = (sub?.plans as unknown as { bump_cooldown_minutes: number } | null)?.bump_cooldown_minutes ?? 60;
  const last = ad.bumped_at ? new Date(ad.bumped_at) : null;
  if (!canBump(last, cooldown, new Date())) {
    const next = nextBumpAt(last, cooldown);
    const remainingMs = next ? Math.max(0, next.getTime() - Date.now()) : 0;
    return NextResponse.json({ error: "cooldown", remainingMs, cooldownMinutes: cooldown }, { status: 429 });
  }

  const { error } = await admin.rpc("bump_ad", { p_ad: ad.id });
  if (error) return apiError(GENERIC_ERROR, 500, error);

  // sinal de geo por IP (UF do acesso × UF do anúncio)
  try {
    const uf = ((Array.isArray(ad.cities) ? ad.cities[0] : ad.cities) as { uf?: string } | null)?.uf ?? null;
    await recordGeoAndFlag(admin, user.id, geoFromRequest(request), uf);
  } catch (e) { console.error("geo bump:", e); }

  return NextResponse.json({ ok: true, cooldownMinutes: cooldown });
}
