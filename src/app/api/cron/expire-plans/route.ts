import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ensureFreeBaseline } from "@/lib/access";

export const runtime = "nodejs";

// Roda 1x/dia (Vercel Cron): planos PAGOS vencidos voltam pro Grátis vitalício —
// o anúncio continua na vitrine, só perde os recursos pagos. (Freemium.)
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: expired } = await admin
    .from("subscriptions")
    .select("profile_id, method")
    .eq("status", "active")
    .lt("current_period_end", nowIso);

  let n = 0;
  for (const s of (expired ?? []) as { profile_id: string; method: string | null }[]) {
    const m = String(s.method ?? "");
    if (m === "free" || m === "cortesia") continue;
    if (await ensureFreeBaseline(admin, s.profile_id)) n++;
  }
  return NextResponse.json({ ok: true, downgraded: n });
}
