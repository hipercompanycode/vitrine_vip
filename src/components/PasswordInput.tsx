"use client";
import { useState } from "react";

// Input de senha com botão "exibir senha" (ícone de olho). Repassa todas as
// props de <input> (value, onChange, name, placeholder, autoComplete, etc.).
type Props = Omit<React.ComponentProps<"input">, "type"> & { className?: string };

export default function PasswordInput({ className = "", ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...rest} type={show ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={show}
        title={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-ink"
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.4 5.2A9.3 9.3 0 0 1 12 5c5 0 9 5 9 7 0 .8-.9 2.3-2.4 3.6M6.2 6.7C3.9 8.1 3 9.9 3 12c0 2 4 7 9 7 1.2 0 2.3-.2 3.3-.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.9" />
          </svg>
        )}
      </button>
    </div>
  );
}
