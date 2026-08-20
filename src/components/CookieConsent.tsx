"use client";
import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const has = document.cookie.split("; ").some((c) => c.startsWith("cookie_consent="));
    setShow(!has);
  }, []);

  if (!show) return null;

  function choose(v: "all" | "essential") {
    document.cookie = `cookie_consent=${v}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-pop backdrop-blur-md sm:flex-row sm:items-center">
        <p className="flex-1 text-xs leading-relaxed text-muted">
          Usamos cookies essenciais para login, preferências e segurança. Você pode aceitar todos ou manter só os essenciais.{" "}
          <a href="/cookies" className="font-semibold text-accent underline">Saiba mais</a>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("essential")}
            className="rounded-pill border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Só essenciais
          </button>
          <button
            onClick={() => choose("all")}
            className="rounded-pill bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-strong"
          >
            Aceitar cookies
          </button>
        </div>
      </div>
    </div>
  );
}
