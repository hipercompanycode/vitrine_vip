import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const whatsapp = String(form.get("whatsapp") ?? "").trim();

  const admin = createAdminClient();
  await admin.from("profiles").update({ name, whatsapp }).eq("id", user.id);
  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
