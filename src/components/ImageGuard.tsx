"use client";
import { useEffect } from "react";

// Atrito anti-cópia nas imagens: bloqueia botão-direito ("salvar imagem") e
// arrastar-pra-salvar em qualquer <img>. É só fricção — print continua possível
// (a web não impede isso); a defesa real é a marca d'água nas fotos.
export default function ImageGuard() {
  useEffect(() => {
    const block = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === "IMG") e.preventDefault();
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
