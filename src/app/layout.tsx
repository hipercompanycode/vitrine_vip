import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import AgeGate from "@/components/AgeGate";
import CookieConsent from "@/components/CookieConsent";
import { SITE_NAME, SITE_URL, ldWebSite, jsonLdScript } from "@/lib/seo";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const DESC =
  "Acompanhantes e garotas de programa verificadas na sua cidade. Fotos e vídeos reais, perfis atualizados e contato direto por WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Acompanhantes e Garotas de Programa`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESC,
  applicationName: SITE_NAME,
  keywords: ["acompanhantes", "garotas de programa", "acompanhantes verificadas", "massagem"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "pt_BR",
    url: SITE_URL,
    title: `${SITE_NAME} — Acompanhantes e Garotas de Programa`,
    description: DESC,
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: DESC },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const ageOk = (await cookies()).get("age_ok")?.value === "1";
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {!ageOk && <AgeGate />}
        <CookieConsent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ldWebSite()) }} />
      </body>
    </html>
  );
}
