"use client";
import { useEffect } from "react";

// Registra 1 visualização por sessão (dedupe via sessionStorage).
export default function ViewTracker({ adId }: { adId: string }) {
  useEffect(() => {
    try {
      const k = `v_${adId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
      fetch("/api/ads/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_id: adId }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [adId]);
  return null;
}
