"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { validateFile, MEDIA_LIMITS, VIDEO_ENABLED } from "@/lib/media";
import { publicUrl } from "@/lib/storage";
import CameraCapture from "@/components/CameraCapture";

type Media = { id: string; type: "photo" | "video"; storage_path: string; is_cover: boolean; review?: string };

function uuid(): string {
  return crypto.randomUUID();
}

async function videoTooLong(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration > MEDIA_LIMITS.video.maxSeconds + 0.5); };
    v.onerror = () => resolve(false);
    v.src = URL.createObjectURL(file);
  });
}

const WATERMARK_TEXT = "vitrinevip.com.br";
const ACCENT = "#ff2e88"; // cor do nome do site (identidade visual)

// Marca d'água única e centrada (queimada na imagem), na cor da marca — protege e divulga.
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  // dimensiona pra ocupar ~58% da largura da foto
  ctx.font = "700 100px sans-serif";
  const target = w * 0.58;
  const fontSize = Math.max(14, (100 * target) / ctx.measureText(WATERMARK_TEXT).width);
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 12); // leve inclinação (-15°)
  // contorno escuro pra ler em qualquer fundo + preenchimento na cor da marca
  ctx.lineWidth = Math.max(2, fontSize * 0.06);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeText(WATERMARK_TEXT, 0, 0);
  ctx.fillStyle = ACCENT;
  ctx.globalAlpha = 0.72;
  ctx.fillText(WATERMARK_TEXT, 0, 0);
  ctx.restore();
}

// Redimensiona a foto + aplica a marca d'água no navegador antes de subir.
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<{ blob: Blob; ext: string; type: string }> {
  try {
    const img = await createImageBitmap(file);
    let { width, height } = img;
    if (Math.max(width, height) > maxDim) {
      const s = maxDim / Math.max(width, height);
      width = Math.round(width * s);
      height = Math.round(height * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(img, 0, 0, width, height);
    drawWatermark(ctx, width, height);
    const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", quality));
    img.close?.();
    // sempre usa a versão com marca d'água (não é só compressão).
    return { blob, ext: "jpg", type: "image/jpeg" };
  } catch {
    // fallback raro (falha ao processar): sobe o original sem marca.
    const ext = file.name.split(".").pop() || "jpg";
    return { blob: file, ext, type: file.type };
  }
}

export default function MediaManager({
  adId, userId, initial, maxPhotos = 12, maxVideos = 3,
}: { adId: string; userId: string; initial: Media[]; maxPhotos?: number; maxVideos?: number }) {
  const supabase = createBrowserClient();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const [items, setItems] = useState<Media[]>(initial);
  const [nudezMode, setNudezMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [camOpen, setCamOpen] = useState(false);

  const nPhotos = items.filter((m) => m.type === "photo").length;
  const nVideos = items.filter((m) => m.type === "video").length;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await handleFiles(files);
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setMsg(""); setBusy(true);

    // contagens locais que acompanham os uploads no loop
    let photos = items.filter((m) => m.type === "photo").length;
    let videos = items.filter((m) => m.type === "video").length;
    let hasCover = items.some((m) => m.type === "photo" && m.is_cover);
    let firstError = "";

    for (const file of files) {
      const v = validateFile({ type: file.type, size: file.size });
      if (!v.ok) { firstError ||= v.error; continue; }
      if (v.kind === "photo" && photos >= maxPhotos) { firstError ||= `Limite de ${maxPhotos} fotos no seu plano.`; break; }
      if (v.kind === "video" && videos >= maxVideos) { firstError ||= `Limite de ${maxVideos} vídeos no seu plano.`; break; }
      if (v.kind === "video" && (await videoTooLong(file))) { firstError ||= "Vídeo acima de 60s."; continue; }

      const prepared = v.kind === "photo"
        ? await compressImage(file)
        : { blob: file as Blob, ext: file.name.split(".").pop() || "bin", type: file.type };
      const path = `${userId}/${adId}/${uuid()}.${prepared.ext}`;
      const up = await supabase.storage.from("ad-media").upload(path, prepared.blob, { contentType: prepared.type });
      if (up.error) { firstError ||= up.error.message; continue; }

      const body = new FormData();
      body.set("ad_id", adId); body.set("storage_path", path); body.set("type", v.kind);
      if (v.kind === "photo" && nudezMode) body.set("nudez", "1");
      const res = await fetch("/api/media", { method: "POST", body });
      if (!res.ok) {
        await supabase.storage.from("ad-media").remove([path]); // remove órfão
        const j = await res.json().catch(() => ({}));
        firstError ||= j.error ?? "Falha ao registrar mídia.";
        continue;
      }
      const { id, review } = await res.json();
      const isCover = v.kind === "photo" && !hasCover;
      if (isCover) hasCover = true;
      if (v.kind === "photo") photos++; else videos++;
      setItems((cur) => [...cur, { id, type: v.kind, storage_path: path, is_cover: isCover, review }]);
    }

    if (firstError) setMsg(firstError);
    setBusy(false);
  }

  async function setCover(id: string) {
    const body = new FormData(); body.set("media_id", id);
    const res = await fetch("/api/media/cover", { method: "POST", body });
    if (res.ok) setItems((cur) => cur.map((m) => ({ ...m, is_cover: m.id === id })));
  }

  async function remove(id: string) {
    const body = new FormData(); body.set("media_id", id);
    const res = await fetch("/api/media/delete", { method: "POST", body });
    if (res.ok) setItems((cur) => cur.filter((m) => m.id !== id));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-semibold">Fotos {nPhotos}/{maxPhotos}</span>
        {VIDEO_ENABLED && <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-semibold">Vídeos {nVideos}/{maxVideos}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-input border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft ${nPhotos >= maxPhotos ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "Enviando…" : "Adicionar fotos"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onPick} disabled={busy || nPhotos >= maxPhotos} />
        </label>
        <button
          type="button"
          onClick={() => setCamOpen(true)}
          disabled={busy || nPhotos >= maxPhotos}
          className={`inline-flex items-center gap-2 rounded-input border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft ${nPhotos >= maxPhotos ? "pointer-events-none opacity-50" : ""}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" /></svg>
          Tirar foto
        </button>
        {VIDEO_ENABLED && (
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-input border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft ${nVideos >= maxVideos ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? "Enviando…" : "Adicionar vídeo"}
            <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={onPick} disabled={busy || nVideos >= maxVideos} />
          </label>
        )}
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-input border border-line bg-surface-2/40 px-3 py-2.5 text-xs">
        <input type="checkbox" checked={nudezMode} onChange={(e) => setNudezMode(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
        <span className="text-muted">Marcar as próximas fotos como <strong className="text-ink">nudez total</strong> — aparecem <strong className="text-ink">borradas</strong> pra quem não está logado (exigência legal, ECA). Sem marcar, a foto passa por <strong className="text-ink">aprovação</strong> antes de aparecer no anúncio.</span>
      </label>
      {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}

      {camOpen && (
        <CameraCapture
          facingMode="environment"
          namePrefix="foto"
          onCapture={(file) => handleFiles([file])}
          onClose={() => setCamOpen(false)}
        />
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((m) => (
          <div
            key={m.id}
            className={`group relative overflow-hidden rounded-xl border transition-shadow ${m.is_cover ? "border-accent ring-2 ring-accent" : "border-line"}`}
          >
            {m.type === "photo" ? (
              <img src={publicUrl(base, "ad-media", m.storage_path)} alt="" className="aspect-[3/4] w-full object-cover" />
            ) : (
              <video src={publicUrl(base, "ad-media", m.storage_path)} className="aspect-[3/4] w-full object-cover" muted />
            )}

            {/* badge capa */}
            {m.is_cover && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-pill bg-accent px-2 py-0.5 text-[11px] font-bold text-white shadow-pop">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" /></svg>
                Capa
              </span>
            )}

            {/* estado de moderação da foto */}
            {m.type === "photo" && m.review && m.review !== "liberada" && (
              <span className={`absolute left-2 ${m.is_cover ? "top-9" : "top-2"} inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-bold shadow-sm ${m.review === "nudez" ? "bg-amber-500/90 text-[#231a06]" : "bg-black/70 text-white ring-1 ring-white/20"}`}>
                {m.review === "nudez" ? "🔞 Nudez · borrada" : "⏳ Em análise"}
              </span>
            )}

            {/* apagar */}
            <button
              type="button"
              onClick={() => remove(m.id)}
              aria-label="Apagar foto"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/30 shadow-pop backdrop-blur-sm transition-colors hover:bg-red-500 hover:ring-red-300"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            {/* tornar capa (hover) */}
            {m.type === "photo" && !m.is_cover && (
              <button
                type="button"
                onClick={() => setCover(m.id)}
                className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-pill bg-black/65 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 shadow-pop backdrop-blur-sm transition-colors hover:bg-accent hover:ring-accent"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                Tornar capa
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
