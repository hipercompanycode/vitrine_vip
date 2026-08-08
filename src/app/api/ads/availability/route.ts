import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const value = String(form.get("is_available")) === "true";

  const admin = createAdminClient();
  await admin.from("ads").update({ is_available: value }).eq("profile_id", user.id);
  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
