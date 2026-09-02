import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { flash, GENERIC_ERROR } from "@/lib/http";
import { hashCpf } from "@/lib/cpf-block";
import { reverifyDueISO } from "@/lib/reverify";
import { notify } from "@/lib/notify";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const profileId = String(form.get("profile_id") ?? "");
  const action = String(form.get("action") ?? "");
  const backRaw = String(form.get("back") ?? "/admin/verificacoes");
  const safeBackTop = backRaw.startsWith("/admin") ? backRaw : "/admin/verificacoes";

  // alterna o selo "sem rosto" no anúncio (informativo, fora do fluxo approve/reject)
  if (action === "face") {
    if (!profileId) return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
    const admin = createAdminClient();
    const hidden = String(form.get("hidden") ?? "") === "1";
    await admin.from("ads").update({ face_hidden: hidden }).eq("profile_id", profileId);
    return NextResponse.redirect(new URL(safeBackTop, request.url), { status: 303 });
  }

  if (!profileId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const back = String(form.get("back") ?? "/admin/verificacoes");
  const safeBack = back.startsWith("/admin") ? back : "/admin/verificacoes";
  const approved = action === "approve";
  const feedback = String(form.get("feedback") ?? "").trim().slice(0, 500);
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("verifications")
    .update({
      status: approved ? "approved" : "rejected",
      reviewed_at: nowIso,
      feedback: approved ? null : (feedback || null),
      // ao aprovar, reinicia o ciclo de reverificação (30 dias) e limpa gatilhos
      ...(approved ? { verified_at: nowIso, reverify_due: reverifyDueISO(nowIso), reverify_forced: false, reverify_reason: null } : {}),
    })
    .eq("profile_id", profileId);
  if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);

  // liga/desliga o selo "Verificada" do anúncio desse anunciante
  await admin.from("ads").update({ verified: approved }).eq("profile_id", profileId);

  // notifica o anunciante (in-app)
  await notify(admin, profileId, approved
    ? { kind: "moderation", title: "Anúncio aprovado ✅", body: "Seu perfil foi verificado e está no ar.", href: "/meu-anuncio" }
    : { kind: "moderation", title: "Verificação recusada", body: feedback ? `Motivo: ${feedback}` : "Revise seus documentos e envie novamente.", href: "/meu-anuncio" });

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

  // Ao aprovar: concede o plano Grátis vitalício (freemium), se ainda não tem
  // assinatura paga vigente. Sem cobrança e sem vencimento real (100 anos).
  if (approved) {
    const nowMs = Date.now();
    const { data: sub } = await admin
      .from("subscriptions").select("status, method, current_period_end").eq("profile_id", profileId).maybeSingle();
    const hasActivePaid = !!sub && sub.status === "active" && sub.method !== "trial" && sub.method !== "free"
      && !!sub.current_period_end && new Date(sub.current_period_end as string).getTime() > nowMs;
    if (!hasActivePaid) {
      const { data: free } = await admin.from("plans").select("id").eq("slug", "free").maybeSingle();
      if (free?.id) {
        await admin.from("subscriptions").upsert({
          profile_id: profileId,
          plan_id: free.id,
          status: "active",
          method: "free",
          current_period_end: new Date(nowMs + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "profile_id" });
      }
    }
  }

  return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
}
