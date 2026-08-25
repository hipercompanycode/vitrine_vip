"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import CameraCapture from "@/components/CameraCapture";
import { CLIENT_CATEGORIES } from "@/lib/client-reports";

const MAX_IMG = 15 * 1024 * 1024;

export default function ClientReportForm({ userId }: { userId: string }) {
  const supabase = createBrowserClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "photo" | "submit">("");
  const [cam, setCam] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; s: string } | null>(null);

  async function handlePhoto(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setMsg({ t: "err", s: "Envie uma imagem." }); return; }
    if (f.size > MAX_IMG) { setMsg({ t: "err", s: "Imagem acima de 15 MB." }); return; }
    setBusy("photo"); setMsg(null);
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("client-reports").upload(path, f, { contentType: f.type, upsert: true });
    setBusy("");
    if (up.error) { setMsg({ t: "err", s: up.error.message }); return; }
    setPhotoPath(path);
  }

  async function submit() {
    setMsg(null);
    if (!category) { setMsg({ t: "err", s: "Escolha o motivo." }); return; }
    if (description.trim().length < 15) { setMsg({ t: "err", s: "Descreva o que aconteceu (mín. 15 caracteres)." }); return; }
    setBusy("submit");
    const body = new FormData();
    body.set("phone", phone);
    body.set("category", category);
    body.set("description", description);
    if (photoPath) body.set("photo_path", photoPath);
    const res = await fetch("/api/client-report", { method: "POST", body });
    setBusy("");
    if (!res.ok) { const j = await res.json().catch(() => ({})); setMsg({ t: "err", s: j.error ?? "Falha ao enviar." }); return; }
    setMsg({ t: "ok", s: "Relato enviado para moderação. Obrigada por ajudar a proteger a rede. 💗" });
    setPhone(""); setCategory(""); setDescription(""); setPhotoPath(null);
    router.refresh();
  }

  const inputCls = "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Telefone do cliente (com DDD)</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(11) 99999-9999" className={inputCls} />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Motivo</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
          <option value="">Selecione…</option>
          {CLIENT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">O que aconteceu</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000}
          placeholder="Descreva o ocorrido com o máximo de detalhes (sem ofensas — só os fatos)." className={`${inputCls} resize-none`} />
      </label>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted">Foto do cliente <span className="text-muted/70">(opcional — só a moderação vê)</span></span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy === "photo"}
            className="inline-flex items-center gap-1 rounded-input border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
            {busy === "photo" ? "Enviando…" : photoPath ? "Trocar foto" : "Enviar foto"}
          </button>
          <button type="button" onClick={() => setCam(true)} disabled={busy === "photo"}
            className="inline-flex items-center gap-1 rounded-input border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
            Câmera
          </button>
          {photoPath && <span className="text-xs text-[#43d17f]">✓ foto anexada</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handlePhoto(f); }} />
      </div>

      <button onClick={submit} disabled={busy === "submit"}
        className="w-full rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50">
        {busy === "submit" ? "Enviando…" : "Enviar relato"}
      </button>

      {msg && <p className={`text-sm ${msg.t === "ok" ? "text-[#43d17f]" : "text-red-400"}`}>{msg.s}</p>}

      {cam && (
        <CameraCapture facingMode="environment" namePrefix="cliente" onCapture={(file) => handlePhoto(file)} onClose={() => setCam(false)} />
      )}
    </div>
  );
}
