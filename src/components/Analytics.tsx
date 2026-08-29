"use client";
import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = "G-48J0FSPBBX";

// Google Analytics — carrega APENAS se a pessoa aceitou todos os cookies
// (cookie_consent=all). Quem escolheu "só essenciais" não é rastreado (LGPD).
export default function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const read = () => document.cookie.split("; ").some((c) => c === "cookie_consent=all");
    setEnabled(read());
    const onChange = () => setEnabled(read());
    window.addEventListener("cookieconsent", onChange);
    return () => window.removeEventListener("cookieconsent", onChange);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
