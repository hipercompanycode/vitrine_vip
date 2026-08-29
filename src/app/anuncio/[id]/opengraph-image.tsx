import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Acompanhante verificada — Vitrine VIP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Card de compartilhamento por perfil (WhatsApp/Telegram/X). Branded, SEM foto —
// seguro para preview de chat e alinhado às regras do site (nudez nunca no preview).
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let name = "Acompanhante";
  let cityLabel = "";
  let age: number | null = null;
  let price: string | null = null;
  let verified = false;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("ads").select("title, age, price_cents, verified, cities ( name, uf )").eq("id", id).maybeSingle();
    if (data) {
      name = (data.title as string | null)?.trim() || "Acompanhante";
      age = (data.age as number | null) ?? null;
      verified = !!data.verified;
      const c: any = Array.isArray(data.cities) ? data.cities[0] : data.cities;
      if (c?.name) cityLabel = `${c.name}-${c.uf}`;
      const cents = (data.price_cents as number | null) ?? 0;
      if (cents > 0) price = `R$ ${Math.round(cents / 100).toLocaleString("pt-BR")}`;
    }
  } catch { /* fallback branded */ }

  const meta = [age ? `${age} anos` : null, cityLabel || null].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #1b0f20 0%, #0f0a14 60%)", color: "#f4eef7", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          <span>vitrine</span><span style={{ color: "#ff2e88" }}>vip</span>
          <span style={{ marginLeft: 12, width: 10, height: 10, borderRadius: 999, background: "#ff2e88" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{name}</div>
            {verified && (
              <div style={{ display: "flex", alignItems: "center", marginLeft: 24, gap: 10, fontSize: 26, fontWeight: 700, color: "#43d17f", border: "2px solid #43d17f55", borderRadius: 999, padding: "8px 18px" }}>
                ✓ Verificada
              </div>
            )}
          </div>
          {meta && <div style={{ marginTop: 20, fontSize: 38, color: "#a99fb4" }}>{meta}</div>}
          {price && <div style={{ marginTop: 14, fontSize: 34, fontWeight: 700, color: "#ff2e88" }}>{price}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 28, color: "#a99fb4" }}>Perfil e fotos verificados · contato direto</div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, border: "2px solid #ff2e88", borderRadius: 999, padding: "8px 22px" }}>+18</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
