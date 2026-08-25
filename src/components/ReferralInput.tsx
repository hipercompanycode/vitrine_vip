"use client";
import { useEffect, useRef, useState } from "react";

// Campo "código de indicação". Valida ao vivo (mostra "Indicada por [perfil]") e
// guarda o código válido no localStorage pra ser aplicado quando a conta existir.
const norm = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

export default function ReferralInput({ inputClassName = "" }: { inputClassName?: string }) {
  const [code, setCode] = useState("");
  const [ref, setRef] = useState<{ ok: boolean; name?: string } | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let initial = "";
    try {
      const u = new URLSearchParams(window.location.search).get("ref");
      initial = norm(u || window.localStorage.getItem("ref_pending") || "");
    } catch {}
    if (initial) setCode(initial);
  }, []);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    const c = norm(code);
    if (c.length < 4) { setRef(null); return; }
    t.current = setTimeout(async () => {
      const r = await fetch(`/api/referral/check?code=${encodeURIComponent(c)}`).then((x) => x.json()).catch(() => ({ ok: false }));
      setRef(r);
      try {
        if (r.ok) window.localStorage.setItem("ref_pending", c);
        else window.localStorage.removeItem("ref_pending");
      } catch {}
    }, 400);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [code]);

  const cls = inputClassName || "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">Código de indicação <span className="text-muted/70">(opcional)</span></span>
      <input value={code} onChange={(e) => setCode(norm(e.target.value))} placeholder="Ex.: ABC123" className={cls} autoComplete="off" />
      {ref?.ok && <p className="mt-1 text-xs font-semibold text-[#43d17f]">✓ Indicada por {ref.name}</p>}
      {ref && !ref.ok && norm(code).length >= 4 && <p className="mt-1 text-xs text-amber-300">Código não encontrado — confira com quem indicou.</p>}
    </label>
  );
}
