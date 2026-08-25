import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { flash, GENERIC_ERROR } from "@/lib/http";
import { hashCpf } from "@/lib/cpf-block";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const profileId = String(form.get("profile_id") ?? "");
  const action = String(form.get("action") ?? "");
  if (!profileId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const back = String(form.get("back") ?? "/admin/verificacoes");
  const safeBack = back.startsWith("/admin") ? back : "/admin/verificacoes";
  const approved = action === "approve";
  const feedback = String(form.get("feedback") ?? "").trim().slice(0, 500);
  const { error } = await admin
    .from("verifications")
    .update({
      status: approved ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      feedback: approved ? null : (feedback || null),
    })
    .eq("profile_id", profileId);
  if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);

  // liga/desliga o selo "Verificada" do anúncio desse anunciante
  await admin.from("ads").update({ verified: approved }).eq("profile_id", profileId);

  // Recusa marcando "bloquear CPF": guarda o hash na blocklist (anti-fake).
  if (!approved && form.get("block_cpf") === "1") {
    const { data: v } = await admin.from("verifications").select("cpf").eq("profile_id", profileId).maybeSingle();
    if (v?.cpf) {
      await admin.from("blocked_cpfs").upsert(
        { cpf_hash: hashCpf(v.cpf as string), reason: feedback || "fake", blocked_by: user!.id },
        { onConflict: "cpf_hash" }
      );
    }
  }

  // Ao aprovar: concede 7 dias de teste grátis (uma vez), se ainda não tem plano pago ativo.
  if (approved) {
    const nowMs = Date.now();
    const [{ data: prof }, { data: sub }] = await Promise.all([
      admin.from("profiles").select("trial_used").eq("id", profileId).maybeSingle(),
      admin.from("subscriptions").select("status, method, current_period_end").eq("profile_id", profileId).maybeSingle(),
    ]);
    const hasActivePaid = !!sub && sub.status === "active" && sub.method !== "trial"
      && !!sub.current_period_end && new Date(sub.current_period_end as string).getTime() > nowMs;
    if (!prof?.trial_used && !hasActivePaid) {
      const { data: pro } = await admin.from("plans").select("id").eq("slug", "pro").maybeSingle();
      if (pro?.id) {
        await admin.from("subscriptions").upsert({
          profile_id: profileId,
          plan_id: pro.id,
          status: "active",
          method: "trial",
          current_period_end: new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "profile_id" });
        await admin.from("profiles").update({ trial_used: true }).eq("id", profileId);
      }
    }
  }

  return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
}
