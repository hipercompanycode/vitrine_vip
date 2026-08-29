"use client";
import { useEffect, useRef, useState } from "react";

// Botão "Áudio" no card: toca a voz da anunciante sem navegar (para a propagação
// do clique no card, que é um link).
export default function CardAudioButton({ url, className = "" }: { url: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(url);
    a.preload = "none";
    a.onended = () => setPlaying(false);
    a.onpause = () => setPlaying(false);
    ref.current = a;
    return () => { a.pause(); ref.current = null; };
  }, [url]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const a = ref.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.currentTime = 0; a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pausar áudio" : "Ouvir áudio"}
      className={`inline-flex items-center gap-1.5 rounded-pill bg-[#1d5fa5] px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-[#2470bf] ${className}`}
    >
      {playing ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" /></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      )}
      Áudio
    </button>
  );
}
