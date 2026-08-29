import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/server";
import { parseCitySlug, citySlug, regionForCity } from "@/lib/seo";

export const runtime = "nodejs";
export const alt = "Acompanhantes por cidade — Vitrine VIP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Card de compartilhamento por cidade.
export default async function Image({ params }: { params: Promise<{ cidade: string }> }) {
  const { cidade } = await params;
  let cityLabel = "";
  let regionName: string | null = null;
  try {
    const parsed = parseCitySlug(cidade);
    if (parsed) {
      const admin = createAdminClient();
      const { data } = await admin.from("cities").select("name, uf").eq("uf", parsed.uf);
      const c = ((data ?? []) as { name: string; uf: string }[]).find((x) => citySlug(x.name, x.uf) === cidade);
      if (c) {
        cityLabel = `${c.name}-${c.uf}`;
        regionName = regionForCity(c.name, c.uf)?.name ?? null;
      }
    }
  } catch { /* fallback branded */ }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #1b0f20 0%, #0f0a14 60%)", color: "#f4eef7", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          <span>vitrine</span><span style={{ color: "#ff2e88" }}>vip</span>
          <span style={{ marginLeft: 12, width: 10, height: 10, borderRadius: 999, background: "#ff2e88" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 48, color: "#a99fb4", fontWeight: 600 }}>Acompanhantes em</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, lineHeight: 1, color: "#ff2e88" }}>{cityLabel || "sua cidade"}</div>
          {regionName && <div style={{ marginTop: 20, fontSize: 32, color: "#a99fb4" }}>{regionName}</div>}
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
