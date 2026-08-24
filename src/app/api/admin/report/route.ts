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
  const back = String(form.get("back") ?? "/admin");
  const safeBack = back.startsWith("/admin") ? back : "/admin";
  const reportId = String(form.get("report_id") ?? "");
  const adId = String(form.get("ad_id") ?? "");
  if (!reportId && !adId) return flash(request, safeBack, "erro", "Denúncia inválida.");
  const status = String(form.get("status") ?? "reviewed") === "open" ? "open" : "reviewed";

  const admin = createAdminClient();
  // ad_id = arquiva/reabre TODAS as denúncias do anúncio (cards agrupados). report_id = uma só (compat).
  const q = admin.from("reports").update({ status });
  const { error } = await (adId ? q.eq("ad_id", adId) : q.eq("id", reportId));
  if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);
  return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
}
