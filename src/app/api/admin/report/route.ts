import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { flash, GENERIC_ERROR } from "@/lib/http";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const reportId = String(form.get("report_id") ?? "");
  if (!reportId) return NextResponse.json({ error: "report_id obrigatório" }, { status: 400 });
  const status = String(form.get("status") ?? "reviewed") === "open" ? "open" : "reviewed";

  const admin = createAdminClient();
  // volta pra aba de onde veio (arquivar -> continua nas abertas; reabrir -> arquivadas)
  const back = String(form.get("back") ?? "/admin");
  const safeBack = back.startsWith("/admin") ? back : "/admin";
  const { error } = await admin.from("reports").update({ status }).eq("id", reportId);
  if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);
  return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
}
