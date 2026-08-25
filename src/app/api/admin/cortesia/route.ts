import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { flash, GENERIC_ERROR } from "@/lib/http";

// Vencimento "infinito" — assinatura cortesia (vitalícia). Funciona com toda a
// checagem de assinatura ativa (status active + current_period_end > agora).
const NEVER = "3000-01-01T00:00:00.000Z";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const profileId = String(form.get("profile_id") ?? "");
  const action = String(form.get("action") ?? "");
  const back = String(form.get("back") ?? "/admin/verificacoes");
  const safeBack = back.startsWith("/admin") ? back : "/admin/verificacoes";
  if (!profileId || (action !== "grant" && action !== "revoke")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (action === "grant") {
    const { data: plan } = await admin.from("plans").select("id").eq("slug", "premium").maybeSingle();
    if (!plan?.id) return flash(request, safeBack, "erro", GENERIC_ERROR);
    const { error } = await admin.from("subscriptions").upsert(
      { profile_id: profileId, plan_id: plan.id, status: "active", method: "cortesia", current_period_end: NEVER },
      { onConflict: "profile_id" }
    );
    if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);
    return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
  }

  // revoke: cancela a cortesia
  const { error } = await admin.from("subscriptions")
    .update({ status: "canceled" })
    .eq("profile_id", profileId).eq("method", "cortesia");
  if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);
  return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
}
