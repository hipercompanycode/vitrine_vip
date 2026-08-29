"use client";
import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { publicUrl } from "@/lib/storage";

const MAX_SECONDS = 40;
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

function uuid() { return crypto.randomUUID(); }

function pickMime(): { mime: string; ext: string } {
  const cands = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ];
  for (const c of cands) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", ext: "webm" };
}

export default function AudioRecorder({
  adId, userId, initialPath,
}: { adId: string; userId: string; initialPath: string | null }) {
  const supabase = createBrowserClient();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const [savedUrl, setSavedUrl] = useState<string | null>(initialPath ? publicUrl(base, "ad-media", initialPath) : null);
  const [rec, setRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [ext, setExt] = useState("webm");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function stopTimer() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }

  async function startRec() {
    setMsg("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMsg("Não foi possível acessar o microfone. Permita o acesso ou envie um arquivo.");
      return;
    }
    const { mime, ext: e } = pickMime();
    setExt(e);
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mrRef.current = mr;
    chunks.current = [];
    mr.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const b = new Blob(chunks.current, { type: mime || "audio/webm" });
      setBlob(b);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(b));
    };
    mr.start();
    setRec(true);
    setElapsed(0);
    timer.current = setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= MAX_SECONDS) { stopRec(); return MAX_SECONDS; }
        return s + 1;
      });
    }, 1000);
  }

  function stopRec() {
    stopTimer();
    setRec(false);
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMsg("");
    if (!f.type.startsWith("audio/")) { setMsg("Envie um arquivo de áudio (mp3, m4a, ogg…)."); return; }
    if (f.size > MAX_BYTES) { setMsg("Áudio acima de 12 MB."); return; }
    setBlob(f);
    setExt(f.name.split(".").pop() || "mp3");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function save() {
    if (!blob) return;
    if (blob.size > MAX_BYTES) { setMsg("Áudio muito grande (máx. 12 MB)."); return; }
    setBusy(true); setMsg("");
    const path = `${userId}/${adId}/audio-${uuid()}.${ext}`;
    const ctype = (blob.type || "audio/webm").split(";")[0]; // sem ;codecs (o bucket compara o mime base)
    const up = await supabase.storage.from("ad-media").upload(path, blob, { contentType: ctype });
    if (up.error) { setMsg(up.error.message); setBusy(false); return; }
    const body = new FormData();
    body.set("ad_id", adId); body.set("storage_path", path);
    const res = await fetch("/api/audio", { method: "POST", body });
    if (!res.ok) {
      await supabase.storage.from("ad-media").remove([path]);
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Falha ao salvar o áudio."); setBusy(false); return;
    }
    setSavedUrl(publicUrl(base, "ad-media", path) + `?v=${Date.now()}`);
    setBlob(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setBusy(false);
  }

  async function removeSaved() {
    setBusy(true);
    const body = new FormData(); body.set("ad_id", adId);
    const res = await fetch("/api/audio/delete", { method: "POST", body });
    if (res.ok) setSavedUrl(null);
    setBusy(false);
  }

  function discard() {
    setBlob(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  }

  const mm = (s: number) => `0:${String(s).padStart(2, "0")}`;
  const btn = "inline-flex items-center justify-center gap-2 rounded-input px-4 py-2.5 text-sm font-semibold transition-colors";

  return (
    <div className="space-y-3">
      {savedUrl && !blob && (
        <div className="rounded-input border border-line bg-surface-2 p-3">
          <p className="mb-2 text-xs font-semibold text-[#43d17f]">Áudio ativo no anúncio</p>
          <audio controls src={savedUrl} className="w-full" />
          <button type="button" onClick={removeSaved} disabled={busy} className="mt-2 text-xs text-muted underline transition-colors hover:text-red-300 disabled:opacity-50">Remover áudio</button>
        </div>
      )}

      {blob && previewUrl && (
        <div className="rounded-input border border-accent/40 bg-accent-soft/25 p-3">
          <p className="mb-2 text-xs font-semibold text-accent">Prévia — ouça antes de salvar</p>
          <audio controls src={previewUrl} className="w-full" />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={save} disabled={busy} className={`${btn} bg-accent text-white hover:bg-accent-strong disabled:opacity-50`}>{busy ? "Salvando…" : "Salvar áudio"}</button>
            <button type="button" onClick={discard} disabled={busy} className={`${btn} border border-line bg-surface text-muted hover:text-ink`}>Descartar</button>
          </div>
        </div>
      )}

      {!blob && (
        <div className="flex flex-wrap gap-2">
          {rec ? (
            <button type="button" onClick={stopRec} className={`${btn} bg-red-500 text-white hover:bg-red-600`}>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> Parar ({mm(elapsed)})
            </button>
          ) : (
            <button type="button" onClick={startRec} disabled={busy} className={`${btn} bg-accent text-white hover:bg-accent-strong disabled:opacity-50`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              {savedUrl ? "Regravar" : "Gravar áudio"}
            </button>
          )}
          <label className={`${btn} cursor-pointer border border-line bg-surface text-ink hover:border-accent hover:text-accent`}>
            Enviar arquivo
            <input type="file" accept="audio/*" className="hidden" onChange={onFile} disabled={busy || rec} />
          </label>
        </div>
      )}

      <p className="text-[11px] text-muted">Grave até {MAX_SECONDS}s de voz (ou envie um arquivo, máx. 12 MB). O áudio aparece no seu anúncio pro cliente ouvir.</p>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </div>
  );
}
