import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();

  const patch: Record<string, string | null> = { name };
  // só toca no whatsapp se o form enviar o campo (o contato mora no anúncio)
  if (form.has("whatsapp")) patch.whatsapp = String(form.get("whatsapp") ?? "").trim();

  // data de nascimento: aceita só data plausível (não futura, <120 anos); vazio limpa
  if (form.has("birthdate")) {
    const bd = String(form.get("birthdate") ?? "").trim();
    if (!bd) {
      patch.birthdate = null;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(bd)) {
      const d = new Date(`${bd}T00:00:00`);
      const min = new Date(); min.setFullYear(min.getFullYear() - 120);
      if (!Number.isNaN(d.getTime()) && d <= new Date() && d >= min) patch.birthdate = bd;
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
  if (error) console.error("profile update:", error.message);
  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
