import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// Registra 1 visualização do anúncio (público). Deduplicado no cliente por sessão.
export async function POST(request: Request) {
  const { ad_id } = await request.json().catch(() => ({ ad_id: "" }));
  if (!ad_id) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const rl = rateLimit(`${clientKey(request)}:view:${ad_id}`, 3, 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: true }); // silencioso, não infla

  const admin = createAdminClient();
  await admin.rpc("inc_ad_views", { p_ad: ad_id });
  return NextResponse.json({ ok: true });
}
