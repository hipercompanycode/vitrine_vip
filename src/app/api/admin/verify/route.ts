import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

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
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // liga/desliga o selo "Verificada" do anúncio desse anunciante
  await admin.from("ads").update({ verified: approved }).eq("profile_id", profileId);

  const back = String(form.get("back") ?? "/admin/verificacoes");
  return NextResponse.redirect(new URL(back.startsWith("/admin") ? back : "/admin/verificacoes", request.url), { status: 303 });
}
