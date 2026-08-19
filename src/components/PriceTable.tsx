"use client";
import { useState } from "react";
import { inputCls } from "./ui";

type Row = { label: string; value: string };

export default function PriceTable({ initial }: { initial?: { label: string; price_cents: number }[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial && initial.length
      ? initial.map((r) => ({ label: r.label, value: (r.price_cents / 100).toFixed(2).replace(".", ",") }))
      : [{ label: "", value: "" }]
  );

  function update(i: number, k: keyof Row, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function add() { setRows((rs) => [...rs, { label: "", value: "" }]); }
  function remove(i: number) { setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs)); }

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input name="price_label" value={r.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Serviço (ex: 1 hora)" className={`${inputCls} min-w-0 flex-1`} />
          <div className="relative w-28 shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
            <input name="price_value" value={r.value} onChange={(e) => update(i, "value", e.target.value)} inputMode="decimal" placeholder="150,00" className={`${inputCls} pl-8`} />
          </div>
          <button type="button" onClick={() => remove(i)} aria-label="Remover" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input border border-line text-muted transition-colors hover:border-red-400 hover:text-red-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        Adicionar preço
      </button>
    </div>
  );
}
