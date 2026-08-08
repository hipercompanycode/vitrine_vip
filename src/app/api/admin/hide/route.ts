import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!adId || (status !== "hidden" && status !== "active")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("ads").update({ status }).eq("id", adId);
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
