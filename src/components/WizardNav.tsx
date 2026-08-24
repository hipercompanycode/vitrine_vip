"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

// Navegação do wizard (Próximo/Concluir): mostra spinner + "Carregando…" enquanto a
// próxima etapa carrega, pra o usuário saber que a ação está executando.
export default function WizardNav({ href, label, className }: { href: string; label: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => start(() => router.push(href))}
      className={`inline-flex items-center justify-center gap-2 ${className ?? ""}`}
    >
      {pending && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? "Carregando…" : label}
    </button>
  );
}
