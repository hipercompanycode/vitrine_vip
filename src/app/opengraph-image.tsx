import { ImageResponse } from "next/og";

export const alt = "Vitrine VIP — Acompanhantes verificadas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1b0f20 0%, #0f0a14 60%)",
          color: "#f4eef7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 96, fontWeight: 800, letterSpacing: -3 }}>
          <span>vitrine</span>
          <span style={{ color: "#ff2e88" }}>vip</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 34, color: "#a99fb4" }}>
          Acompanhantes verificadas · perfis reais · contato direto
        </div>
        <div
          style={{
            marginTop: 44,
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            color: "#f4eef7",
            border: "2px solid #ff2e88",
            borderRadius: 999,
            padding: "8px 22px",
          }}
        >
          +18
        </div>
      </div>
    ),
    { ...size }
  );
}
