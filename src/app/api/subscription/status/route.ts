import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions").select("status, method, current_period_end").eq("profile_id", user.id).maybeSingle();
  return NextResponse.json({ sub: sub ?? null, active: isActive(sub ?? null, new Date()) });
}
