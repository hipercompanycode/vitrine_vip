import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

// Gera uma cópia FORTEMENTE borrada da foto (pra servir ao anônimo em fotos de
// nudez) e sobe no mesmo bucket com sufixo .blur.jpg. Retorna o caminho da cópia.
// Anônimo nunca recebe a foto original — só esta versão borrada.
export async function makeBlur(admin: SupabaseClient, storagePath: string): Promise<string | null> {
  try {
    const dl = await admin.storage.from("ad-media").download(storagePath);
    if (!dl.data) return null;
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const out = await sharp(buf)
      .resize(400, 500, { fit: "cover" })
      .blur(28)               // borrão pesado — não dá pra reconstruir a imagem
      .modulate({ brightness: 0.9 })
      .jpeg({ quality: 45 })
      .toBuffer();
    const blurPath = storagePath.replace(/\.[^.]+$/, "") + ".blur.jpg";
    const up = await admin.storage.from("ad-media").upload(blurPath, out, { contentType: "image/jpeg", upsert: true });
    if (up.error) return null;
    return blurPath;
  } catch {
    return null;
  }
}

// Apaga a cópia borrada (quando a foto vira 'liberada' ou é excluída).
export async function deleteBlur(admin: SupabaseClient, blurPath: string | null): Promise<void> {
  if (!blurPath) return;
  try { await admin.storage.from("ad-media").remove([blurPath]); } catch {}
}
