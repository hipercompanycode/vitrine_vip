import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

// PWA: permite "adicionar à tela inicial" (app-like) no celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Acompanhantes verificadas`,
    short_name: SITE_NAME,
    description: "Acompanhantes verificadas na sua cidade. Fotos reais e contato direto por WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0a14",
    theme_color: "#0f0a14",
    lang: "pt-BR",
    dir: "ltr",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
