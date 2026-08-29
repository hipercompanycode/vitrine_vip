"use client";
import { useState } from "react";

// Campo de data de nascimento digitável (DD/MM/AAAA) — melhor no mobile que o
// <input type="date"> (que só abre datepicker). Guarda um input oculto no
// formato ISO (AAAA-MM-DD) pro backend/validação.
function toDisplay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function toIso(digits: string): string {
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
  return `${y}-${m}-${d}`;
}

export default function BirthdateInput({
  name, defaultValue = "", className, onIso,
}: { name?: string; defaultValue?: string; className?: string; onIso?: (iso: string) => void }) {
  const [display, setDisplay] = useState(toDisplay(defaultValue));
  const [iso, setIso] = useState(defaultValue && /^\d{4}-\d{2}-\d{2}$/.test(defaultValue) ? defaultValue : "");

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let disp = digits;
    if (digits.length > 4) disp = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) disp = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setDisplay(disp);
    const next = toIso(digits);
    setIso(next);
    onIso?.(next);
  }

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="DD/MM/AAAA"
        value={display}
        onChange={onChange}
        maxLength={10}
        className={className}
      />
      {name && <input type="hidden" name={name} value={iso} />}
    </>
  );
}
