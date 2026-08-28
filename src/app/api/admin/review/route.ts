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
  const reviewId = String(form.get("review_id") ?? "");
  const action = String(form.get("action") ?? "");
  const back = String(form.get("back") ?? "/admin/avaliacoes");
  const safeBack = back.startsWith("/admin") ? back : "/admin/avaliacoes";
  if (!reviewId || (action !== "excluir" && action !== "liberar")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (action === "excluir") {
    const { error } = await admin.from("reviews").delete().eq("id", reviewId);
    if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);
  } else {
    const { error } = await admin.from("reviews").update({ status: "publicada" }).eq("id", reviewId);
    if (error) return flash(request, safeBack, "erro", GENERIC_ERROR, error);
  }
  return NextResponse.redirect(new URL(safeBack, request.url), { status: 303 });
}
