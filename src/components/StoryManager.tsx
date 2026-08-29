"use client";
import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { MEDIA_LIMITS, kindOfMime } from "@/lib/media";

const MAX_SECONDS = 60;
function uuid() { return crypto.randomUUID(); }

function pickMime(): { mime: string; ext: string } {
  const cands = [
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
    { mime: "video/mp4", ext: "mp4" },
  ];
  for (const c of cands) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", ext: "webm" };
}

async function videoTooLong(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration > MAX_SECONDS + 0.5); };
    v.onerror = () => resolve(false);
    v.src = URL.createObjectURL(file);
  });
}

export default function StoryManager({
  adId, userId, hasStory, cooldownHoursLeft = 0,
}: { adId: string; userId: string; hasStory: boolean; cooldownHoursLeft?: number }) {
  const locked = cooldownHoursLeft > 0;
  const supabase = createBrowserClient();
  const [exists, setExists] = useState(hasStory);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [rec, setRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [ext, setExt] = useState("webm");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const liveRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timer.current) clearInterval(timer.current);
  }, [previewUrl]);

  function stopTimer() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }

  async function startRec() {
    setMsg("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
    } catch {
      setMsg("Não foi possível acessar a câmera. Permita o acesso ou envie um vídeo."); return;
    }
    streamRef.current = stream;
    if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.play().catch(() => {}); }
    const { mime, ext: e } = pickMime();
    setExt(e);
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mrRef.current = mr;
    chunks.current = [];
    mr.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (liveRef.current) liveRef.current.srcObject = null;
      const b = new Blob(chunks.current, { type: mime || "video/webm" });
      setBlob(b);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(b));
    };
    mr.start();
    setRec(true); setElapsed(0);
    timer.current = setInterval(() => setElapsed((s) => {
      if (s + 1 >= MAX_SECONDS) { stopRec(); return MAX_SECONDS; }
      return s + 1;
    }), 1000);
  }

  function stopRec() {
    stopTimer(); setRec(false);
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg("");
    if (kindOfMime(file.type) !== "video") { setMsg("Envie um vídeo (mp4/webm)."); return; }
    if (file.size > MEDIA_LIMITS.video.maxBytes) { setMsg("Vídeo acima de 50 MB."); return; }
    if (await videoTooLong(file)) { setMsg(`Vídeo acima de ${MAX_SECONDS}s.`); return; }
    setBlob(file);
    setExt(file.name.split(".").pop() || "mp4");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function save() {
    if (!blob) return;
    if (blob.size > MEDIA_LIMITS.video.maxBytes) { setMsg("Vídeo acima de 50 MB."); return; }
    setBusy(true); setMsg("");
    const path = `${userId}/${adId}/story-${uuid()}.${ext}`;
    const ctype = (blob.type || "video/webm").split(";")[0]; // sem ;codecs (o bucket compara o mime base)
    const up = await supabase.storage.from("ad-media").upload(path, blob, { contentType: ctype });
    if (up.error) { setMsg(up.error.message); setBusy(false); return; }
    const body = new FormData();
    body.set("ad_id", adId); body.set("storage_path", path);
    const res = await fetch("/api/story", { method: "POST", body });
    if (!res.ok) {
      await supabase.storage.from("ad-media").remove([path]);
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Falha ao salvar story."); setBusy(false); return;
    }
    setExists(true); discard(); setBusy(false);
  }

  function discard() {
    setBlob(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  }

  async function remove() {
    setBusy(true);
    const body = new FormData(); body.set("ad_id", adId);
    const res = await fetch("/api/story/delete", { method: "POST", body });
    if (res.ok) setExists(false);
    setBusy(false);
  }

  const mm = (s: number) => `0:${String(s).padStart(2, "0")}`;
  const btn = "inline-flex items-center justify-center gap-2 rounded-input px-4 py-2.5 text-sm font-semibold transition-colors";

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Vídeo de até {MAX_SECONDS}s que aparece na capa do anúncio por <strong className="text-ink">24h</strong>. {exists && !blob ? "Story ativo agora." : ""}</p>

      <div className={`relative overflow-hidden rounded-xl bg-black ${rec || (blob && previewUrl) ? "block" : "hidden"}`}>
        {rec && <video ref={liveRef} muted playsInline className="aspect-[3/4] w-full object-cover" />}
        {!rec && blob && previewUrl && <video src={previewUrl} controls playsInline className="aspect-[3/4] w-full object-cover" />}
        {rec && <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-pill bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />REC {mm(elapsed)}</span>}
      </div>

      {blob && previewUrl ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={busy} className={`${btn} bg-accent text-white hover:bg-accent-strong disabled:opacity-50`}>{busy ? "Salvando…" : "Salvar story"}</button>
          <button type="button" onClick={discard} disabled={busy} className={`${btn} border border-line bg-surface text-muted hover:text-ink`}>Descartar</button>
        </div>
      ) : rec ? (
        <button type="button" onClick={stopRec} className={`${btn} bg-red-500 text-white hover:bg-red-600`}>
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> Parar ({mm(elapsed)})
        </button>
      ) : locked ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2.5 rounded-input border border-line bg-surface-2/40 px-3 py-2.5 text-xs text-muted">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-px shrink-0 text-muted" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <span>Você já gravou um story. Só dá pra gravar outro em <strong className="text-ink">~{cooldownHoursLeft}h</strong> (1 por dia). {exists ? "Pode remover o atual, mas o prazo continua." : "Você removeu o story, mas o prazo continua."}</span>
          </div>
          {exists && (
            <button type="button" onClick={remove} disabled={busy} className={`${btn} border border-line bg-surface text-muted hover:text-red-300 disabled:opacity-50`}>Remover story</button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startRec} disabled={busy} className={`${btn} bg-accent text-white hover:bg-accent-strong disabled:opacity-50`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" /></svg>
            {exists ? "Regravar story" : "Gravar story"}
          </button>
          <label className={`${btn} cursor-pointer border border-line bg-surface text-ink hover:border-accent hover:text-accent`}>
            Enviar vídeo
            <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={onFile} disabled={busy} />
          </label>
          {exists && (
            <button type="button" onClick={remove} disabled={busy} className={`${btn} border border-line bg-surface text-muted hover:text-red-300 disabled:opacity-50`}>Remover story</button>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </div>
  );
}
