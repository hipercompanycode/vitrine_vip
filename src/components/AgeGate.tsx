"use client";
import { useState } from "react";

export default function AgeGate() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  function accept() {
    document.cookie = `age_ok=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOpen(false);
  }
  function leave() {
    window.location.href = "https://www.google.com";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/95 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 text-center shadow-pop sm:p-9">
        <div className="mb-5 inline-flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </div>

        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-black text-accent">
          +18
        </span>

        <h1 className="font-display text-xl font-extrabold text-ink">Conteúdo adulto</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Este site contém material destinado a maiores de 18 anos. Ao entrar, você declara ter{" "}
          <strong className="text-ink">18 anos ou mais</strong> e concorda com os{" "}
          <a href="/termos" className="text-accent underline">Termos de Uso</a> e a{" "}
          <a href="/privacidade" className="text-accent underline">Política de Privacidade</a>.
        </p>

        <div className="mt-6 space-y-2.5">
          <button
            onClick={accept}
            className="w-full rounded-input bg-accent py-3 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            Tenho 18 anos ou mais — entrar
          </button>
          <button
            onClick={leave}
            className="w-full rounded-input border border-line bg-surface py-3 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
