import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizeRefCode } from "@/lib/referral";

export const dynamic = "force-dynamic";

// Valida um código de indicação e devolve o NOME PÚBLICO (título do anúncio) de
// quem indicou. Usado pra mostrar "Indicada por [perfil]" na hora de digitar.
export async function GET(request: Request) {
  const code = normalizeRefCode(new URL(request.url).searchParams.get("code") ?? "");
  if (code.length < 4) return NextResponse.json({ ok: false });
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("id").eq("ref_code", code).maybeSingle();
  if (!prof) return NextResponse.json({ ok: false });
  const { data: ad } = await admin.from("ads").select("title").eq("profile_id", prof.id).maybeSingle();
  return NextResponse.json({ ok: true, name: (ad?.title as string | null)?.trim() || "uma anunciante" });
}
