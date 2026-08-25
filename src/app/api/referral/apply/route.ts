import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { normalizeRefCode } from "@/lib/referral";

export const runtime = "nodejs";

// Aplica a indicação ao usuário logado: grava referred_by = perfil dono do código
// (uma vez só; sem auto-indicação). Devolve o nome público de quem indicou.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { code } = await request.json().catch(() => ({ code: "" }));
  const c = normalizeRefCode(code ?? "");
  if (c.length < 4) return NextResponse.json({ ok: false });

  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("referred_by").eq("id", user.id).maybeSingle();
  if (me?.referred_by) return NextResponse.json({ ok: true, already: true });

  const { data: ref } = await admin.from("profiles").select("id").eq("ref_code", c).maybeSingle();
  if (!ref || ref.id === user.id) return NextResponse.json({ ok: false }); // inválido ou auto-indicação

  await admin.from("profiles").update({ referred_by: ref.id }).eq("id", user.id);
  const { data: ad } = await admin.from("ads").select("title").eq("profile_id", ref.id).maybeSingle();
  return NextResponse.json({ ok: true, name: (ad?.title as string | null)?.trim() || "uma anunciante" });
}
