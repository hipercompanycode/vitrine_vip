"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { MEDIA_LIMITS, kindOfMime } from "@/lib/media";

function uuid() { return crypto.randomUUID(); }

async function videoTooLong(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration > 60.5); };
    v.onerror = () => resolve(false);
    v.src = URL.createObjectURL(file);
  });
}

export default function StoryManager({
  adId, userId, hasStory,
}: { adId: string; userId: string; hasStory: boolean }) {
  const supabase = createBrowserClient();
  const [exists, setExists] = useState(hasStory);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg("");
    if (kindOfMime(file.type) !== "video") { setMsg("Envie um vídeo (mp4/webm)."); return; }
    if (file.size > MEDIA_LIMITS.video.maxBytes) { setMsg("Vídeo acima de 150 MB."); return; }
    if (await videoTooLong(file)) { setMsg("Vídeo acima de 60s."); return; }

    setBusy(true);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/${adId}/story-${uuid()}.${ext}`;
    const up = await supabase.storage.from("ad-media").upload(path, file, { contentType: file.type });
    if (up.error) { setMsg(up.error.message); setBusy(false); return; }

    const body = new FormData();
    body.set("ad_id", adId); body.set("storage_path", path);
    const res = await fetch("/api/story", { method: "POST", body });
    if (!res.ok) {
      await supabase.storage.from("ad-media").remove([path]);
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Falha ao salvar story.");
      setBusy(false);
      return;
    }
    setExists(true);
    setBusy(false);
  }

  async function remove() {
    const body = new FormData(); body.set("ad_id", adId);
    const res = await fetch("/api/story/delete", { method: "POST", body });
    if (res.ok) setExists(false);
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        Vídeo de até 60s que aparece na capa do anúncio por 24h. {exists ? "Story ativo." : "Sem story ativo."}
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-input border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft">
          {busy ? "Enviando…" : exists ? "Trocar story" : "Enviar story"}
          <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={onPick} disabled={busy} />
        </label>
        {exists && (
          <button onClick={remove} className="rounded-input border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
            Remover story
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
    </div>
  );
}
