import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // destino explícito (ex.: veio de "Anunciar") tem prioridade
  const next = new URL(request.url).searchParams.get("next") ?? "";
  if (next && next !== "/" && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  // por papel
  if (isAdminUser(user, process.env.ADMIN_EMAIL)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const dest = prof?.role === "anunciante" ? "/meu-anuncio" : "/";
  return NextResponse.redirect(new URL(dest, request.url));
}
