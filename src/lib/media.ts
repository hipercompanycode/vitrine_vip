export type MediaKind = "photo" | "video";

// Vídeo na galeria do anúncio está desligado até o upgrade do Supabase
// (plano Free limita upload a 50 MB no projeto todo). Reativar = true.
export const VIDEO_ENABLED = false;

// Teto real de upload do projeto no Supabase (plano Free = 50 MB, cap global
// que vence o limite do bucket). Subir só no plano Pro.
export const GLOBAL_UPLOAD_MAX = 50 * 1024 * 1024;

export const MEDIA_LIMITS = {
  photo: { maxBytes: 15 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp"] as string[] },
  video: { maxBytes: GLOBAL_UPLOAD_MAX, mimes: ["video/mp4", "video/webm"] as string[], maxSeconds: 60 },
} as const;

export function kindOfMime(mime: string): MediaKind | null {
  if (MEDIA_LIMITS.photo.mimes.includes(mime)) return "photo";
  if (MEDIA_LIMITS.video.mimes.includes(mime)) return "video";
  return null;
}

export function validateFile(
  file: { type: string; size: number }
): { ok: true; kind: MediaKind } | { ok: false; error: string } {
  const kind = kindOfMime(file.type);
  if (!kind) return { ok: false, error: "Formato não suportado (use JPG/PNG/WEBP ou MP4/WEBM)." };
  const lim = MEDIA_LIMITS[kind];
  if (file.size > lim.maxBytes) {
    const mb = Math.round(lim.maxBytes / (1024 * 1024));
    return { ok: false, error: `Arquivo acima do limite de ${mb} MB.` };
  }
  return { ok: true, kind };
}

export function remaining(
  kind: MediaKind, maxPhotos: number, maxVideos: number, photos: number, videos: number
): number {
  const max = kind === "photo" ? maxPhotos : maxVideos;
  const cur = kind === "photo" ? photos : videos;
  return Math.max(0, max - cur);
}
