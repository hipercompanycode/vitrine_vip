import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { canBump, nextBumpAt } from "@/lib/bump";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("id, bumped_at, profile_id").eq("profile_id", user.id).maybeSingle();
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cooldownMinutes: cooldown });
}
