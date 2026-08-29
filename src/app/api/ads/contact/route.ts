import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// Registra 1 clique no contato (WhatsApp/Telegram/ligação).
export async function POST(request: Request) {
  let ad_id = "";
  try {
    const body = await request.json();
    ad_id = String(body.ad_id ?? "");
  } catch {
    // sendBeacon pode mandar texto puro
    const txt = await request.text().catch(() => "");
    ad_id = txt.trim();
  }
  if (!ad_id) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const rl = rateLimit(`${clientKey(request)}:contact:${ad_id}`, 10, 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await admin.rpc("inc_ad_contacts", { p_ad: ad_id });
  await admin.from("ad_events").insert({ ad_id, kind: "contact" });
  return NextResponse.json({ ok: true });
}
