"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

const MAX_DOC = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO = 150 * 1024 * 1024; // 150 MB

function Slot({ label, hint, done, busy, accept, onPick }: {
  label: string; hint: string; done: boolean; busy: boolean; accept: string; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
      <span className="text-sm font-semibold text-ink">{busy ? "Enviando…" : done ? `${label} enviado` : label}</span>
      <span className="text-[11px] text-muted">{hint}</span>
      <input type="file" accept={accept} className="hidden" onChange={onPick} disabled={busy} />
    </label>
  );
}

export default function VerificationUploader({ userId, status: initStatus, hasDoc, hasVideo }: {
  userId: string; status: string | null; hasDoc: boolean; hasVideo: boolean;
}) {
  const supabase = createBrowserClient();
  const [docPath, setDocPath] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(initStatus);
  const [busy, setBusy] = useState<"" | "doc" | "video" | "submit">("");
  const [msg, setMsg] = useState("");

  const docDone = !!docPath || hasDoc;
  const videoDone = !!videoPath || hasVideo;

  async function upload(file: File, kind: "doc" | "video"): Promise<string | null> {
    setBusy(kind); setMsg("");
    const ext = file.name.split(".").pop() || (kind === "doc" ? "jpg" : "mp4");
    const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("verifications").upload(path, file, { contentType: file.type, upsert: true });
    setBusy("");
    if (up.error) { setMsg(up.error.message); return null; }
    return path;
  }

  async function onDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (!f.type.startsWith("image/")) { setMsg("O documento deve ser uma imagem (foto)."); return; }
    if (f.size > MAX_DOC) { setMsg("Imagem acima de 15 MB."); return; }
    const p = await upload(f, "doc"); if (p) setDocPath(p);
  }
  async function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (!f.type.startsWith("video/")) { setMsg("Envie um vídeo."); return; }
    if (f.size > MAX_VIDEO) { setMsg("Vídeo acima de 150 MB."); return; }
    const p = await upload(f, "video"); if (p) setVideoPath(p);
  }

  async function submit() {
    if (!docPath || !videoPath) { setMsg("Envie o documento e o vídeo antes de enviar para verificação."); return; }
    setBusy("submit");
    const body = new FormData();
    body.set("doc_path", docPath); body.set("video_path", videoPath);
    const res = await fetch("/api/verification", { method: "POST", body });
    setBusy("");
    if (!res.ok) { const j = await res.json().catch(() => ({})); setMsg(j.error ?? "Falha ao enviar."); return; }
    setStatus("pending"); setMsg("");
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-3 rounded-card border border-[#1f6b3f] bg-[#0f2a1b] px-4 py-4 text-sm text-[#7ee2a8]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div><p className="font-semibold">Verificação aprovada</p><p className="text-xs opacity-80">Seu selo “Verificada” está ativo.</p></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "pending" && (
        <div className="rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent">Comprovação enviada — em análise. Você recebe o selo assim que aprovarmos.</div>
      )}
      {status === "rejected" && (
        <div className="rounded-card border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">Comprovação recusada. Reenvie um documento e vídeo nítidos.</div>
      )}

      <p className="text-xs text-muted">
        Pra ganhar o selo <strong className="text-ink">Verificada</strong> (e mais confiança), envie: uma foto de um <strong className="text-ink">documento com foto</strong> (RG/CNH) e um <strong className="text-ink">vídeo curto</strong> seu. Arquivos <strong className="text-ink">privados</strong> — só a moderação vê, nunca aparecem no anúncio.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Slot label="Documento com foto" hint="Foto do RG ou CNH (imagem)" done={docDone} busy={busy === "doc"} accept="image/*" onPick={onDoc} />
        <Slot label="Vídeo de verificação" hint="Vídeo curto seu (até 150 MB)" done={videoDone} busy={busy === "video"} accept="video/*" onPick={onVideo} />
      </div>

      <button onClick={submit} disabled={busy === "submit" || !docPath || !videoPath}
        className="w-full rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50">
        {busy === "submit" ? "Enviando…" : "Enviar para verificação"}
      </button>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </div>
  );
}
