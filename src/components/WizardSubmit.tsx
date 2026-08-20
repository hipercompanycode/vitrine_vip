"use client";
import { useState } from "react";

// Botão de submit do wizard: mostra "Salvando…" ao clicar, sem esconder a página.
export default function WizardSubmit({ formId, className, label = "Salvar e continuar" }: { formId: string; className?: string; label?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="submit"
      form={formId}
      onClick={() => setPending(true)}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 ${className ?? ""}`}
    >
      {pending && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? "Salvando…" : `${label} →`}
    </button>
  );
}
