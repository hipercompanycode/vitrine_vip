"use client";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

// Spinner que aparece enquanto a navegação está pendente (feedback do clique).
// Fica sempre no DOM, só troca a opacidade — sem layout shift (recomendação da doc).
function PendingSpinner() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex transition-opacity duration-150 ${pending ? "opacity-100" : "opacity-0"}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Igual ao <Link>, mas mostra um spinner enquanto a próxima tela carrega. */
export default function PendingLink({ className = "", children, prefetch = false, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link {...rest} prefetch={prefetch} className={`relative ${className}`}>
      {children}
      <PendingSpinner />
    </Link>
  );
}
