"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SucessoPage() {
  const [state, setState] = useState<"checking" | "active" | "pending">("checking");

  useEffect(() => {
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      if (data.active) { setState("active"); clearInterval(id); }
      else if (tries >= 10) { setState("pending"); clearInterval(id); }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
      {state === "checking" && <p className="text-sm text-muted">Confirmando seu pagamento…</p>}
      {state === "active" && (
        <>
          <h1 className="font-display text-2xl font-extrabold text-ink">Assinatura ativa 🎉</h1>
          <p className="mt-2 text-sm text-muted">Seu anúncio já está visível.</p>
          <Link href="/perfil" className="mt-5 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white">Ir para meu painel</Link>
        </>
      )}
      {state === "pending" && (
        <>
          <h1 className="font-display text-xl font-bold text-ink">Pagamento em processamento</h1>
          <p className="mt-2 text-sm text-muted">Se pagou via Pix, a confirmação pode levar alguns instantes. Atualize esta página.</p>
          <Link href="/perfil" className="mt-5 rounded-pill border border-line px-5 py-2.5 text-sm font-semibold text-ink">Voltar ao painel</Link>
        </>
      )}
    </main>
  );
}
