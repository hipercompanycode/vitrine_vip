"use client";
import { useState } from "react";

export default function FavoriteButton({
  adId, initialActive, canInteract, loggedIn,
}: { adId: string; initialActive: boolean; canInteract: boolean; loggedIn: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) { window.location.href = "/login"; return; }
    if (!canInteract || busy) return;
    setBusy(true);
    const prev = active;
    setActive(!prev);
    const body = new FormData();
    body.set("ad_id", adId);
    const res = await fetch("/api/favorite", { method: "POST", body });
    if (!res.ok) setActive(prev);
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy || (loggedIn && !canInteract)}
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
      } disabled:opacity-50`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      {active ? "Salvo" : "Favoritar"}
    </button>
  );
}
