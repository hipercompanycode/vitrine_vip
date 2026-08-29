import { ImageResponse } from "next/og";
import { regionBySlug } from "@/lib/seo";

export const runtime = "nodejs";
export const alt = "Acompanhantes por região — Vitrine VIP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Card de compartilhamento por região.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = regionBySlug(slug);
  const name = region?.name ?? "Sua região";
  const cities = region ? region.cities.slice(0, 6).map((c) => c.name).join(" · ") : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #1b0f20 0%, #0f0a14 60%)", color: "#f4eef7", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          <span>vitrine</span><span style={{ color: "#ff2e88" }}>vip</span>
          <span style={{ marginLeft: 12, width: 10, height: 10, borderRadius: 999, background: "#ff2e88" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 48, color: "#a99fb4", fontWeight: 600 }}>Acompanhantes na</div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, color: "#ff2e88" }}>{name}</div>
          {cities && <div style={{ marginTop: 24, fontSize: 30, color: "#a99fb4" }}>{cities}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 28, color: "#a99fb4" }}>Perfis verificados · fotos reais · contato direto</div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, border: "2px solid #ff2e88", borderRadius: 999, padding: "8px 22px" }}>+18</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
