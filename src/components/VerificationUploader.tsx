"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

const MAX_IMG = 15 * 1024 * 1024; // 15 MB

type Kind = "doc" | "face" | "body";

function Slot({ label, hint, done, busy, onPick }: {
  label: string; hint: string; done: boolean; busy: boolean; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed px-4 py-6 text-center transition-colors ${done ? "border-[#1f6b3f] bg-[#0f2a1b]" : "border-line bg-surface-2/40 hover:border-accent/60"}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-[#164a2c] text-[#7ee2a8]" : "bg-accent-soft text-accent"}`}>
        {done ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4M12 4l-4 4M12 4l4 4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <span className="text-sm font-semibold text-ink">{busy ? "Enviando…" : done ? `${label} enviada` : label}</span>
      <span className="text-[11px] text-muted">{hint}</span>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
    </label>
  );
}

export default function VerificationUploader({ userId, status: initStatus, hasDoc, hasFace, hasBody, feedback }: {
  userId: string; status: string | null; hasDoc: boolean; hasFace: boolean; hasBody: boolean; feedback?: string | null;
}) {
  const supabase = createBrowserClient();
  const [docPath, setDocPath] = useState<string | null>(null);
  const [facePath, setFacePath] = useState<string | null>(null);
  const [bodyPath, setBodyPath] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(initStatus);
  const [busy, setBusy] = useState<"" | Kind | "submit">("");
  const [msg, setMsg] = useState("");

  const docDone = !!docPath || hasDoc;
  const faceDone = !!facePath || hasFace;
  const bodyDone = !!bodyPath || hasBody;

  async function upload(file: File, kind: Kind): Promise<string | null> {
    setBusy(kind); setMsg("");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("verifications").upload(path, file, { contentType: file.type, upsert: true });
    setBusy("");
    if (up.error) { setMsg(up.error.message); return null; }
    return path;
  }

  function picker(kind: Kind, set: (p: string) => void) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
      if (!f.type.startsWith("image/")) { setMsg("Envie uma imagem (foto)."); return; }
      if (f.size > MAX_IMG) { setMsg("Imagem acima de 15 MB."); return; }
      const p = await upload(f, kind); if (p) set(p);
    };
  }

  async function submit() {
    if (!docPath || !facePath || !bodyPath) { setMsg("Envie o documento, a foto do rosto e a foto de corpo antes de enviar."); return; }
    setBusy("submit");
    const body = new FormData();
    body.set("doc_path", docPath); body.set("face_path", facePath); body.set("body_path", bodyPath);
    const res = await fetch("/api/verification", { method: "POST", body });
    setBusy("");
    if (!res.ok) { const j = await res.json().catch(() => ({})); setMsg(j.error ?? "Falha ao enviar."); return; }
    setStatus("pending"); setMsg("");
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 shadow-card ring-1 ring-[#43d17f]/15">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div>
          <p className="font-semibold text-ink">Verificação aprovada</p>
          <p className="text-xs text-muted">Seu selo “Verificada” está ativo.</p>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#12331f] px-2.5 py-1 text-[11px] font-bold text-[#43d17f]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>Verificada
        </span>
      </div>
    );
  }

  const canSubmit = !!docPath && !!facePath && !!bodyPath;

  return (
    <div className="space-y-3">
      {status === "pending" && (
        <div className="rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent">Comprovação enviada — em análise. Você recebe o selo assim que aprovarmos.</div>
      )}
      {status === "rejected" && (
        <div className="rounded-card border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <p className="font-semibold">Comprovação recusada. Reenvie o documento e as fotos nítidas.</p>
          {feedback && <p className="mt-1 text-red-200/90"><span className="font-semibold">Motivo:</span> {feedback}</p>}
        </div>
      )}

      <p className="text-xs text-muted">
        Pra ganhar o selo <strong className="text-ink">Verificada</strong> (e mais confiança), envie: uma foto de um <strong className="text-ink">documento com foto</strong> (RG/CNH), uma <strong className="text-ink">foto do rosto</strong> e uma <strong className="text-ink">foto de corpo inteiro com o rosto visível</strong> (pra confirmar que é você). Arquivos <strong className="text-ink">privados</strong> — só a moderação vê, nunca aparecem no anúncio.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Slot label="Documento com foto" hint="RG ou CNH (imagem)" done={docDone} busy={busy === "doc"} onPick={picker("doc", setDocPath)} />
        <Slot label="Foto do rosto" hint="Selfie nítida do rosto" done={faceDone} busy={busy === "face"} onPick={picker("face", setFacePath)} />
        <Slot label="Foto de corpo + rosto" hint="Corpo inteiro com o rosto visível" done={bodyDone} busy={busy === "body"} onPick={picker("body", setBodyPath)} />
      </div>

      <button onClick={submit} disabled={busy === "submit" || !canSubmit}
        className="w-full rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50">
        {busy === "submit" ? "Enviando…" : "Enviar para verificação"}
      </button>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </div>
  );
}
