"use client";
import { useState } from "react";

type Point = { d: string; v: number; c: number };

// Gráfico de área (visualizações) + linha (contatos) por dia. SVG puro, responsivo.
export default function MetricsChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 200, padX = 8, padTop = 14, padBottom = 26;
  const n = data.length;
  const maxV = Math.max(1, ...data.map((p) => p.v));
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const x = (i: number) => padX + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const yV = (val: number) => padTop + innerH - (val / maxV) * innerH;
  const maxC = Math.max(1, ...data.map((p) => p.c));
  const yC = (val: number) => padTop + innerH - (val / maxC) * innerH;

  const viewsLine = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yV(p.v).toFixed(1)}`).join(" ");
  const viewsArea = `${viewsLine} L${x(n - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;
  const contactsLine = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yC(p.c).toFixed(1)}`).join(" ");

  const labelEvery = Math.ceil(n / 7);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-accent"><span className="h-2 w-2 rounded-full bg-accent" />Visualizações</span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#4a9be8]"><span className="h-2 w-2 rounded-full bg-[#4a9be8]" />Contatos</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }} preserveAspectRatio="none" role="img" aria-label="Visualizações e contatos por dia">
        <defs>
          <linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padX} x2={W - padX} y1={padTop + innerH * (1 - g)} y2={padTop + innerH * (1 - g)} stroke="var(--line)" strokeWidth="1" opacity="0.5" />
        ))}
        <path d={viewsArea} fill="url(#vfill)" />
        <path d={viewsLine} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={contactsLine} fill="none" stroke="#4a9be8" strokeWidth="2" strokeDasharray="1 0" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((p, i) => (
          <g key={i}>
            {hover === i && <line x1={x(i)} x2={x(i)} y1={padTop} y2={padTop + innerH} stroke="var(--line)" strokeWidth="1.5" />}
            <circle cx={x(i)} cy={yV(p.v)} r={hover === i ? 4 : 2.4} fill="var(--accent)" />
            <circle cx={x(i)} cy={yC(p.c)} r={hover === i ? 4 : 2} fill="#4a9be8" />
            <rect x={x(i) - innerW / (2 * Math.max(1, n - 1))} y={padTop} width={innerW / Math.max(1, n - 1)} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            {(i % labelEvery === 0 || i === n - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">{p.d}</text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <p className="mt-1 text-center text-xs text-muted">
          <strong className="text-ink">{data[hover].d}</strong> · <span className="text-accent">{data[hover].v} visualizações</span> · <span className="text-[#4a9be8]">{data[hover].c} contatos</span>
        </p>
      )}
    </div>
  );
}
