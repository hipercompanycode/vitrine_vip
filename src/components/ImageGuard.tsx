"use client";
import { useEffect } from "react";

// Atrito anti-cópia nas mídias: bloqueia botão-direito ("salvar imagem/vídeo/
// áudio") e arrastar-pra-salvar em <img>, <video> e <audio>. É só fricção — print
// continua possível (a web não impede isso); a defesa real é a marca d'água + o
// controlsList="nodownload" nos players.
export default function ImageGuard() {
  useEffect(() => {
    const block = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && ["IMG", "VIDEO", "AUDIO"].includes(t.tagName)) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}
