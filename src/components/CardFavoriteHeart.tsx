"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureFavorites, subscribeFavorites, getFavoritesCache, markFavorite } from "@/lib/favorites-client";

// Coração do card: mostra preenchido quando favoritado e adiciona/remove com
// feedback visual (pop + rótulo "Salvo/Removido"). Fica acima do link do card.
export default function CardFavoriteHeart({ adId, initialFavorited }: { adId: string; initialFavorited?: boolean }) {
  const [active, setActive] = useState(!!initialFavorited);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<null | "add" | "remove">(null);
  const [pop, setPop] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const touched = useRef(false); // se o usuário já clicou, o sync não sobrescreve
  const router = useRouter();

  // Sincroniza o estado inicial em páginas cacheadas (cidade): busca os favoritos
  // do usuário (1 chamada compartilhada) e marca o coração.
  useEffect(() => {
    let on = true;
    const apply = () => {
      const c = getFavoritesCache();
      if (c && on && !touched.current) setActive(c.has(adId));
    };
    ensureFavorites().then(apply);
    const unsub = subscribeFavorites(apply);
    return () => { on = false; unsub(); };
  }, [adId]);

  function showFeedback(kind: "add" | "remove") {
    timers.current.forEach(clearTimeout);
    setFlash(kind);
    setPop(true);
    timers.current = [
      setTimeout(() => setPop(false), 220),
      setTimeout(() => setFlash(null), 1400),
    ];
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    touched.current = true;
    setBusy(true);
    const prev = active;
    const next = !prev;
    setActive(next);
    markFavorite(adId, next);
    showFeedback(next ? "add" : "remove");

    const body = new FormData();
    body.set("ad_id", adId);
    const res = await fetch("/api/favorite", { method: "POST", body });
    if (res.status === 401) { window.location.href = "/login?next=/conta"; return; }
    if (!res.ok) { setActive(prev); markFavorite(adId, prev); setFlash(null); setPop(false); }
    else { router.refresh(); } // sincroniza listas (ex.: remove o card em /conta)
    setBusy(false);
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={active}
        aria-label={active ? "Remover dos favoritos" : "Favoritar"}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-transform active:scale-90"
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill={active ? "#ff2e88" : "none"}
          stroke={active ? "#ff2e88" : "white"}
          strokeWidth="2" strokeLinejoin="round"
          className={`transition-transform duration-200 ${pop ? "scale-125" : "scale-100"}`}
          aria-hidden="true"
        >
          <path d="M12 20s-6.5-4.2-9-8C1.2 8.5 3 5 6.3 5 8.2 5 9.4 6.1 12 8.3 14.6 6.1 15.8 5 17.7 5 21 5 22.8 8.5 21 12c-2.5 3.8-9 8-9 8z" />
        </svg>
      </button>
      {flash && (
        <span
          className={`pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-pill px-2 py-0.5 text-[10px] font-bold shadow-pop ${
            flash === "add" ? "bg-accent text-white" : "bg-black/70 text-white"
          }`}
        >
          {flash === "add" ? "Salvo ❤" : "Removido"}
        </span>
      )}
    </span>
  );
}
