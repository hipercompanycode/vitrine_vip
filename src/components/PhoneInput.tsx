"use client";
import { useState } from "react";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// Guarda só o número nacional (DDD + número, 10-11 dígitos). O "55" entra só no envio.
function toNational(v: string): string {
  let d = onlyDigits(v);
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

function maskBR(d: string): string {
  d = d.slice(0, 11);
  if (!d) return "";
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (d.length <= 2) return `(${d}`;
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export default function PhoneInput({
  name = "whatsapp",
  defaultValue = "",
  className,
  placeholder = "(11) 99999-9999",
}: {
  name?: string;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
}) {
  const [digits, setDigits] = useState(() => toNational(defaultValue));
  return (
    <>
      <input
        inputMode="numeric"
        autoComplete="tel"
        value={maskBR(digits)}
        onChange={(e) => setDigits(toNational(e.target.value))}
        placeholder={placeholder}
        className={className}
      />
      <input type="hidden" name={name} value={digits} />
    </>
  );
}
