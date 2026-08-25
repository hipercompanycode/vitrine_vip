"use client";
import { useEffect } from "react";

// Captura o ?ref=CODIGO de qualquer página (link compartilhado) e, se o usuário
// já estiver logado, aplica a indicação. Roda uma vez no layout.
export default function ReferralBoot() {
  useEffect(() => {
    try {
      const u = new URLSearchParams(window.location.search).get("ref");
      if (u) {
        const c = u.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
        if (c.length >= 4) window.localStorage.setItem("ref_pending", c);
      }
    } catch {}

    let code = "";
    try { code = window.localStorage.getItem("ref_pending") || ""; } catch {}
    if (!code) return;

    fetch("/api/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) => {
        if (r.status === 401) return; // ainda não logou: guarda pra aplicar depois
        try { window.localStorage.removeItem("ref_pending"); } catch {}
      })
      .catch(() => {});
  }, []);
  return null;
}
