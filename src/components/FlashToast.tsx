"use client";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function Toast() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const erro = sp.get("erro");
  const ok = sp.get("ok");

  // captura a mensagem no 1º render (os avisos chegam via redirect de formulário = load cheio)
  const [msg, setMsg] = useState<{ kind: "erro" | "ok"; text: string } | null>(() =>
    erro ? { kind: "erro", text: erro } : ok ? { kind: "ok", text: ok } : null
  );

  // limpa os params da URL pra o aviso não reaparecer ao atualizar
  useEffect(() => {
    if (!erro && !ok) return;
    const params = new URLSearchParams(Array.from(sp.entries()));
    params.delete("erro");
    params.delete("ok");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [erro, ok, pathname, router, sp]);

  // some sozinho após alguns segundos
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  const isErr = msg.kind === "erro";
  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <div
        role="status"
        className={`flex max-w-md items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-pop backdrop-blur-md ${
          isErr ? "border-red-500/40 bg-red-500/15 text-red-100" : "border-[#1f6b3f] bg-[#0f2a1b] text-[#9be7bb]"
        }`}
      >
        <span className="mt-0.5 shrink-0" aria-hidden="true">{isErr ? "⚠️" : "✅"}</span>
        <span>{msg.text}</span>
        <button
          type="button"
          onClick={() => setMsg(null)}
          aria-label="Fechar aviso"
          className="ml-1 shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function FlashToast() {
  return (
    <Suspense fallback={null}>
      <Toast />
    </Suspense>
  );
}
