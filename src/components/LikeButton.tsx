"use client";
import { useState } from "react";

export default function LikeButton({
  adId, initialActive, initialCount, canInteract, loggedIn,
}: { adId: string; initialActive: boolean; initialCount: number; canInteract: boolean; loggedIn: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) { window.location.href = "/login"; return; }
    if (!canInteract || busy) return;
    setBusy(true);
    const prev = active;
    setActive(!prev);
    setCount((c) => c + (prev ? -1 : 1));
    const body = new FormData();
    body.set("ad_id", adId);
    const res = await fetch("/api/like", { method: "POST", body });
    if (!res.ok) { setActive(prev); setCount((c) => c + (prev ? 1 : -1)); }
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy || (loggedIn && !canInteract)}
      title={loggedIn && !canInteract ? "Apenas usuários comuns podem curtir" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
      } disabled:opacity-50`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" />
      </svg>
      {count}
    </button>
  );
}
