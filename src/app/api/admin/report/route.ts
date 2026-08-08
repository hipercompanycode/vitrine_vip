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
  const reportId = String(form.get("report_id") ?? "");
  if (!reportId) return NextResponse.json({ error: "report_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("reports").update({ status: "reviewed" }).eq("id", reportId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
