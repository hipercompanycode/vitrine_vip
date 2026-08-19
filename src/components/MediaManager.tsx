"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { validateFile, MEDIA_LIMITS } from "@/lib/media";
import { publicUrl } from "@/lib/storage";

type Media = { id: string; type: "photo" | "video"; storage_path: string; is_cover: boolean };

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

export default function MediaManager({
  adId, userId, initial, maxPhotos = 12, maxVideos = 3,
}: { adId: string; userId: string; initial: Media[]; maxPhotos?: number; maxVideos?: number }) {
  const supabase = createBrowserClient();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const [items, setItems] = useState<Media[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const nPhotos = items.filter((m) => m.type === "photo").length;
  const nVideos = items.filter((m) => m.type === "video").length;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg("");
    const v = validateFile({ type: file.type, size: file.size });
    if (!v.ok) { setMsg(v.error); return; }
    if (v.kind === "photo" && nPhotos >= maxPhotos) { setMsg(`Limite de ${maxPhotos} fotos no seu plano.`); return; }
    if (v.kind === "video" && nVideos >= maxVideos) { setMsg(`Limite de ${maxVideos} vídeos no seu plano.`); return; }
    if (v.kind === "video" && (await videoTooLong(file))) { setMsg("Vídeo acima de 60s."); return; }

    setBusy(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${adId}/${uuid()}.${ext}`;
    const up = await supabase.storage.from("ad-media").upload(path, file, { contentType: file.type });
    if (up.error) { setMsg(up.error.message); setBusy(false); return; }

    const body = new FormData();
    body.set("ad_id", adId); body.set("storage_path", path); body.set("type", v.kind);
    const res = await fetch("/api/media", { method: "POST", body });
    if (!res.ok) {
      await supabase.storage.from("ad-media").remove([path]); // remove órfão
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Falha ao registrar mídia.");
      setBusy(false);
      return;
    }
    const { id } = await res.json();
    setItems((cur) => [...cur, { id, type: v.kind, storage_path: path, is_cover: v.kind === "photo" && !cur.some((m) => m.type === "photo") }]);
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
        <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-semibold">Vídeos {nVideos}/{maxVideos}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-input border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft ${nPhotos >= maxPhotos ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "Enviando…" : "Adicionar foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} disabled={busy || nPhotos >= maxPhotos} />
        </label>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-input border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft ${nVideos >= maxVideos ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "Enviando…" : "Adicionar vídeo"}
          <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={onPick} disabled={busy || nVideos >= maxVideos} />
        </label>
      </div>
      {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="relative overflow-hidden rounded-input border border-line">
            {m.type === "photo" ? (
              <img src={publicUrl(base, "ad-media", m.storage_path)} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <video src={publicUrl(base, "ad-media", m.storage_path)} className="aspect-square w-full object-cover" muted />
            )}
            {m.is_cover && <span className="absolute left-1 top-1 rounded-pill bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">Capa</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/60 px-1 py-0.5 text-[10px] text-white">
              {m.type === "photo" && !m.is_cover
                ? <button onClick={() => setCover(m.id)} className="underline">capa</button>
                : <span />}
              <button onClick={() => remove(m.id)} className="underline">apagar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
