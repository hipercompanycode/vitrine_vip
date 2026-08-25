import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { forceReverify } from "@/lib/reverify";

export const runtime = "nodejs";

// Roda 1x/dia (Vercel Cron): coloca em reverificação quem passou dos 30 dias.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: due } = await admin
    .from("verifications")
    .select("profile_id")
    .eq("status", "approved")
    .lt("reverify_due", nowIso);

  let n = 0;
  for (const r of (due ?? []) as { profile_id: string }[]) {
    if (await forceReverify(admin, r.profile_id, "reverificação periódica (30 dias)")) n++;
  }
  return NextResponse.json({ ok: true, reverified: n });
}
