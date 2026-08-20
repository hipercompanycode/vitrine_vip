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
  const adId = String(form.get("ad_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!adId || (status !== "hidden" && status !== "active")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("ads").update({ status }).eq("id", adId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const back = String(form.get("back") ?? "/admin");
  return NextResponse.redirect(new URL(back.startsWith("/admin") ? back : "/admin", request.url), { status: 303 });
}
