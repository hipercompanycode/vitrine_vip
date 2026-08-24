import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { accountAccess } from "@/lib/access";
import { apiError, GENERIC_ERROR } from "@/lib/http";

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
  return NextResponse.json({ ok: true, is_available: value });
}
