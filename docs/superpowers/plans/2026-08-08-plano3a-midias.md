# Plano 3A — Mídias (fotos/vídeos + capa + galeria) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anunciante envia fotos/vídeos (limites por plano) direto pro Supabase Storage, escolhe a capa e apaga; visitante vê a capa no card/home e a galeria no detalhe.

**Architecture:** Upload direto navegador → Supabase Storage (a Vercel limita body a ~4.5 MB, então vídeo grande não passa por rota Next). Storage RLS restringe escrita ao prefixo do dono. Uma rota `/api/media` valida contagem por plano e registra em `ad_media`. Validação de tipo/tamanho pura e testada; duração 60s checada no cliente. Capa = uma foto com `is_cover`.

**Tech Stack:** Next.js 16 (App Router, TS), Tailwind v4, Supabase (@supabase/ssr, Storage), Vitest.

## Global Constraints

- UI **pt-BR**.
- **Fotos:** `image/jpeg|png|webp`, até **15 MB**. **Vídeos:** `video/mp4|webm`, até **150 MB** e **60s**.
- **Contagem por plano** (de `plans`): Básico 6 fotos/1 vídeo; Pro/Premium 12 fotos/3 vídeos. Sem assinatura ativa → usa limites do Básico.
- Upload **direto do cliente** pro bucket `ad-media`, path `{user_id}/{ad_id}/{uuid}.{ext}`. Storage RLS: escreve só no próprio prefixo; leitura pública.
- **Duração ≤60s** validada no cliente; **tamanho** com teto no bucket; **contagem** validada no servidor (`/api/media`).
- **Uma capa por anúncio** (`ad_media.is_cover`); marcar capa limpa as outras.
- Nomes de tabelas/colunas como na spec `docs/superpowers/specs/2026-08-08-midias-story-design.md`.

---

## File Structure

```
supabase/migrations/0004_media.sql          # ad_media.is_cover + bucket ad-media + storage RLS
src/lib/media.ts + __tests__/media.test.ts  # limites, validateFile, remaining (puro)
src/lib/storage.ts + __tests__/storage.test.ts # publicUrl(base,bucket,path) (puro)
src/app/api/media/route.ts                  # POST registra mídia (checa plano)
src/app/api/media/cover/route.ts            # POST marca capa
src/app/api/media/delete/route.ts           # POST apaga (Storage + linha)
src/components/MediaManager.tsx             # client: upload + lista + capa + apagar
src/app/perfil/page.tsx (modify)            # monta MediaManager (quando há anúncio)
src/components/Gallery.tsx                   # galeria no detalhe (client, thumbs)
src/app/anuncio/[id]/page.tsx (modify)      # carrega mídias; capa + Gallery
src/components/AdCard.tsx (modify)          # usa cover_url na capa
src/app/page.tsx (modify)                   # carrega cover_url por anúncio
src/app/preview/* (modify)                  # mock cover/gallery
```

---

### Task 1: Migration 0004 — is_cover + bucket + Storage RLS

**Files:**
- Create: `supabase/migrations/0004_media.sql`

**Interfaces:**
- Produces: coluna `ad_media.is_cover`; bucket `ad-media` (público, teto 150 MB, MIME allowlist); Storage policies. Aplicado na config.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/0004_media.sql`:
```sql
-- Capa
alter table public.ad_media
  add column if not exists is_cover boolean not null default false;
create index if not exists ad_media_cover_idx on public.ad_media (ad_id) where is_cover;

-- Bucket público com teto de 150 MB e MIME allowlist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-media', 'ad-media', true, 157286400,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS (storage.objects já tem RLS habilitado no Supabase)
create policy "admedia_public_read" on storage.objects
  for select using (bucket_id = 'ad-media');
create policy "admedia_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'ad-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "admedia_owner_update" on storage.objects
  for update using (
    bucket_id = 'ad-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "admedia_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'ad-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0004_media.sql
git commit -m "feat(db): migration 0004 - ad_media.is_cover + bucket ad-media + storage RLS"
```

---

### Task 2: lib/media.ts — limites e validação (TDD)

**Files:**
- Create: `src/lib/media.ts`, `src/lib/__tests__/media.test.ts`

**Interfaces:**
- Produces:
  - `type MediaKind = "photo" | "video"`
  - `MEDIA_LIMITS` (bytes/mimes/maxSeconds)
  - `kindOfMime(mime: string): MediaKind | null`
  - `validateFile(file: { type: string; size: number }): { ok: true; kind: MediaKind } | { ok: false; error: string }`
  - `remaining(kind: MediaKind, maxPhotos: number, maxVideos: number, photos: number, videos: number): number`

- [ ] **Step 1: Teste falhando**

Create `src/lib/__tests__/media.test.ts`:
```ts
import { expect, test } from "vitest";
import { kindOfMime, validateFile, remaining } from "../media";

test("kindOfMime", () => {
  expect(kindOfMime("image/png")).toBe("photo");
  expect(kindOfMime("video/mp4")).toBe("video");
  expect(kindOfMime("application/pdf")).toBeNull();
});

test("validateFile: tipo e tamanho", () => {
  expect(validateFile({ type: "image/jpeg", size: 1_000_000 })).toEqual({ ok: true, kind: "photo" });
  expect(validateFile({ type: "video/webm", size: 1_000_000 })).toEqual({ ok: true, kind: "video" });
  expect(validateFile({ type: "text/plain", size: 10 }).ok).toBe(false);
  expect(validateFile({ type: "image/png", size: 20 * 1024 * 1024 }).ok).toBe(false);
  expect(validateFile({ type: "video/mp4", size: 200 * 1024 * 1024 }).ok).toBe(false);
});

test("remaining por plano/tipo", () => {
  expect(remaining("photo", 6, 1, 2, 0)).toBe(4);
  expect(remaining("video", 6, 1, 0, 1)).toBe(0);
  expect(remaining("photo", 12, 3, 12, 0)).toBe(0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- media`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `src/lib/media.ts`:
```ts
export type MediaKind = "photo" | "video";

export const MEDIA_LIMITS = {
  photo: { maxBytes: 15 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp"] as string[] },
  video: { maxBytes: 150 * 1024 * 1024, mimes: ["video/mp4", "video/webm"] as string[], maxSeconds: 60 },
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
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- media`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media.ts src/lib/__tests__/media.test.ts
git commit -m "feat: validacao de midia (tipo/tamanho) e limite por plano"
```

---

### Task 3: lib/storage.ts — publicUrl (TDD)

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Produces: `publicUrl(baseUrl: string, bucket: string, path: string): string`

- [ ] **Step 1: Teste falhando**

Create `src/lib/__tests__/storage.test.ts`:
```ts
import { expect, test } from "vitest";
import { publicUrl } from "../storage";

test("publicUrl monta URL pública do Storage", () => {
  expect(publicUrl("https://x.supabase.co", "ad-media", "u1/a1/f.jpg"))
    .toBe("https://x.supabase.co/storage/v1/object/public/ad-media/u1/a1/f.jpg");
});

test("publicUrl remove barra final da base", () => {
  expect(publicUrl("https://x.supabase.co/", "ad-media", "a.png"))
    .toBe("https://x.supabase.co/storage/v1/object/public/ad-media/a.png");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- storage`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `src/lib/storage.ts`:
```ts
export function publicUrl(baseUrl: string, bucket: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- storage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: helper publicUrl do Storage"
```

---

### Task 4: Rotas de mídia — registrar, capa, apagar

**Files:**
- Create: `src/app/api/media/route.ts`, `src/app/api/media/cover/route.ts`, `src/app/api/media/delete/route.ts`

**Interfaces:**
- Consumes: `createServerClient`, `createAdminClient`, `remaining`, `MediaKind`.
- Produces:
  - `POST /api/media` (body form: `ad_id`, `storage_path`, `type`) → valida dono + contagem do plano; insere `ad_media`; JSON `{ id }` ou 409 se excede.
  - `POST /api/media/cover` (form: `media_id`) → marca capa (limpa outras). JSON `{ ok: true }`.
  - `POST /api/media/delete` (form: `media_id`) → remove objeto do Storage + linha. JSON `{ ok: true }`.

- [ ] **Step 1: Rota de registro (checa plano)**

Create `src/app/api/media/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { remaining, type MediaKind } from "@/lib/media";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const storagePath = String(form.get("storage_path") ?? "");
  const type = String(form.get("type") ?? "") as MediaKind;
  if (!adId || !storagePath || (type !== "photo" && type !== "video")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  // dono do anúncio?
  const { data: ad } = await admin.from("ads").select("id, profile_id").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  // limites do plano ativo (fallback Básico: 6 fotos / 1 vídeo)
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plans ( max_photos, max_videos )")
    .eq("profile_id", user.id).eq("status", "active").maybeSingle();
  const plan = (sub?.plans as unknown as { max_photos: number; max_videos: number } | null);
  const maxPhotos = plan?.max_photos ?? 6;
  const maxVideos = plan?.max_videos ?? 1;

  // contagem atual
  const { data: rows } = await admin.from("ad_media").select("type").eq("ad_id", adId);
  const photos = (rows ?? []).filter((r: { type: string }) => r.type === "photo").length;
  const videos = (rows ?? []).filter((r: { type: string }) => r.type === "video").length;
  if (remaining(type, maxPhotos, maxVideos, photos, videos) <= 0) {
    return NextResponse.json({ error: "limite do plano atingido" }, { status: 409 });
  }

  const position = (rows ?? []).length;
  const isFirstPhoto = type === "photo" && photos === 0;
  const { data: inserted, error } = await admin
    .from("ad_media")
    .insert({ ad_id: adId, type, storage_path: storagePath, position, is_cover: isFirstPhoto })
    .select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: inserted.id });
}
```

- [ ] **Step 2: Rota de capa**

Create `src/app/api/media/cover/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const mediaId = String(form.get("media_id") ?? "");
  if (!mediaId) return NextResponse.json({ error: "media_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data: media } = await admin
    .from("ad_media").select("id, ad_id, type, ads ( profile_id )").eq("id", mediaId).maybeSingle();
  const ownerId = (media?.ads as unknown as { profile_id: string } | null)?.profile_id;
  if (!media || ownerId !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  if (media.type !== "photo") return NextResponse.json({ error: "capa deve ser foto" }, { status: 400 });

  await admin.from("ad_media").update({ is_cover: false }).eq("ad_id", media.ad_id);
  await admin.from("ad_media").update({ is_cover: true }).eq("id", mediaId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Rota de apagar**

Create `src/app/api/media/delete/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const mediaId = String(form.get("media_id") ?? "");
  if (!mediaId) return NextResponse.json({ error: "media_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data: media } = await admin
    .from("ad_media").select("id, storage_path, ads ( profile_id )").eq("id", mediaId).maybeSingle();
  const ownerId = (media?.ads as unknown as { profile_id: string } | null)?.profile_id;
  if (!media || ownerId !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  await admin.storage.from("ad-media").remove([media.storage_path]);
  await admin.from("ad_media").delete().eq("id", mediaId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/media
git commit -m "feat: rotas de midia (registrar com limite de plano, capa, apagar)"
```

---

### Task 5: MediaManager (client) + painel

**Files:**
- Create: `src/components/MediaManager.tsx`
- Modify: `src/app/perfil/page.tsx`

**Interfaces:**
- Consumes: `createBrowserClient`, `validateFile`, `MEDIA_LIMITS`, `publicUrl`, rotas `/api/media*`.
- Produces: seção de mídias no painel (quando há anúncio): enviar, listar, capa, apagar.

- [ ] **Step 1: Componente**

Create `src/components/MediaManager.tsx`:
```tsx
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
  adId, userId, initial,
}: { adId: string; userId: string; initial: Media[] }) {
  const supabase = createBrowserClient();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const [items, setItems] = useState<Media[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg("");
    const v = validateFile({ type: file.type, size: file.size });
    if (!v.ok) { setMsg(v.error); return; }
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
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-input border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft">
        {busy ? "Enviando…" : "Adicionar foto/vídeo"}
        <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="hidden" onChange={onPick} disabled={busy} />
      </label>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}

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
```

- [ ] **Step 2: Integrar no painel** — carregar mídias e renderizar

Modify `src/app/perfil/page.tsx`:
- Import: `import MediaManager from "@/components/MediaManager";`
- Na `Promise.all`, adicionar a busca de mídias do anúncio (só se houver `ad`); mais simples: após obter `ad`, buscar mídias:
```tsx
const media = ad
  ? (await admin.from("ad_media").select("id, type, storage_path, is_cover").eq("ad_id", ad.id).order("position")).data ?? []
  : [];
```
- Adicionar uma seção após o card "Ações do anúncio" (dentro do `<main>`), quando `ad` existe:
```tsx
{ad && (
  <section className={cardCls}>
    <h2 className="mb-4 font-display text-base font-bold text-ink">Fotos e vídeos</h2>
    <MediaManager adId={ad.id} userId={user.id} initial={media} />
  </section>
)}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/components/MediaManager.tsx src/app/perfil/page.tsx
git commit -m "feat: gestor de midias no painel (upload direto, capa, apagar)"
```

---

### Task 6: Galeria no detalhe + capa

**Files:**
- Create: `src/components/Gallery.tsx`
- Modify: `src/app/anuncio/[id]/page.tsx`, `src/components/AdDetail.tsx`

**Interfaces:**
- Consumes: `publicUrl`.
- Produces: `AdDetail` recebe `media` (URLs) e `coverUrl`; galeria com thumbnails abaixo da capa.

- [ ] **Step 1: Gallery (client)**

Create `src/components/Gallery.tsx`:
```tsx
"use client";
import { useState } from "react";

export type GalleryItem = { url: string; type: "photo" | "video" };

export default function Gallery({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  const cur = items[active];
  return (
    <div>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {cur.type === "photo"
          ? <img src={cur.url} alt="" className="aspect-[16/10] w-full object-cover" />
          : <video src={cur.url} controls playsInline className="aspect-[16/10] w-full bg-black object-contain" />}
      </div>
      {items.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {items.map((it, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-input border ${i === active ? "border-accent" : "border-line"}`}>
              {it.type === "photo"
                ? <img src={it.url} alt="" className="h-full w-full object-cover" />
                : <video src={it.url} className="h-full w-full object-cover" muted />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: AdDetail aceita coverUrl + galeria**

Modify `src/components/AdDetail.tsx`:
- Import: `import Gallery, { type GalleryItem } from "./Gallery";`
- Adicionar props opcionais ao tipo: `coverUrl?: string | null; media?: GalleryItem[];`
- Trocar o bloco da capa (o `<div className="relative overflow-hidden rounded-card ...">` com `<CardMediaPlaceholder .../>`) para usar `coverUrl` quando existir:
```tsx
<div className="relative overflow-hidden rounded-card border border-line shadow-card">
  {coverUrl
    ? <img src={coverUrl} alt={ad.title} className="aspect-[16/10] w-full object-cover" />
    : <CardMediaPlaceholder title={ad.title} className="aspect-[16/10] w-full" />}
  {ad.is_available && <div className="absolute left-4 top-4"><AvailableBadge /></div>}
  <span className="absolute right-4 top-4 rounded-pill bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
    {timeAgo(new Date(ad.created_at), now)}
  </span>
</div>
```
- Logo após o bloco da descrição (antes do CTA WhatsApp), inserir a galeria quando houver mídia:
```tsx
{media && media.length > 0 && (
  <div className="mt-6"><Gallery items={media} /></div>
)}
```

- [ ] **Step 3: Detalhe carrega mídias**

Modify `src/app/anuncio/[id]/page.tsx`:
- Import: `import { publicUrl } from "@/lib/storage";` e `import type { GalleryItem } from "@/components/Gallery";`
- Após montar `reviews`, carregar mídias e capa:
```tsx
const { data: mediaRows } = await admin
  .from("ad_media").select("type, storage_path, is_cover").eq("ad_id", data.id).order("position");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const media: GalleryItem[] = (mediaRows ?? []).map((m: any) => ({
  url: publicUrl(base, "ad-media", m.storage_path), type: m.type,
}));
const coverRow = (mediaRows ?? []).find((m: any) => m.is_cover && m.type === "photo")
  ?? (mediaRows ?? []).find((m: any) => m.type === "photo");
const coverUrl = coverRow ? publicUrl(base, "ad-media", coverRow.storage_path) : null;
```
- Passar ao `AdDetail`: `<AdDetail ad={data} now={new Date()} backHref="/" interactions={interactions} coverUrl={coverUrl} media={media} />`

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 5: Commit**

```bash
git add src/components/Gallery.tsx src/components/AdDetail.tsx src/app/anuncio/"[id]"/page.tsx
git commit -m "feat: galeria no detalhe + capa por foto"
```

---

### Task 7: Capa no card + home

**Files:**
- Modify: `src/components/AdCard.tsx`, `src/app/page.tsx`

**Interfaces:**
- Produces: `AdCardData` ganha `cover_url?: string | null`; card mostra a foto de capa (senão placeholder).

- [ ] **Step 1: AdCard usa cover_url**

Modify `src/components/AdCard.tsx`:
- No tipo `AdCardData`, adicionar `cover_url?: string | null;`
- Trocar o `<CardMediaPlaceholder title={ad.title} className="aspect-[4/3] w-full" />` por:
```tsx
{ad.cover_url
  ? <img src={ad.cover_url} alt={ad.title} className="aspect-[4/3] w-full object-cover" />
  : <CardMediaPlaceholder title={ad.title} className="aspect-[4/3] w-full" />}
```

- [ ] **Step 2: Home carrega cover_url por anúncio**

Modify `src/app/page.tsx` — no bloco que já busca like_count (após montar `ads`), buscar as capas e mesclar:
```tsx
if (ads.length > 0) {
  const ids = ads.map((a) => a.id);
  const { data: covers } = await admin
    .from("ad_media").select("ad_id, storage_path").eq("type", "photo").eq("is_cover", true).in("ad_id", ids);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const { publicUrl } = await import("@/lib/storage");
  const byAd = new Map<string, string>();
  (covers ?? []).forEach((c: { ad_id: string; storage_path: string }) => byAd.set(c.ad_id, publicUrl(base, "ad-media", c.storage_path)));
  ads.forEach((a) => { a.cover_url = byAd.get(a.id) ?? null; });
}
```
> Manter o bloco de like_count existente; este bloco de capas pode ficar logo após.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.
Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdCard.tsx src/app/page.tsx
git commit -m "feat: foto de capa no card e na home"
```

---

### Task 8: Preview (mock de capa + galeria)

**Files:**
- Modify: `src/app/preview/mock.ts`, `src/app/preview/anuncio/[id]/page.tsx`

**Interfaces:**
- Produces: preview mostra capa/galeria com imagens de exemplo (data URI ou gradiente) — sem Storage real.

- [ ] **Step 1: Mock sem depender de Storage**

Modify `src/app/preview/mock.ts` — NÃO setar `cover_url` (deixa cair no placeholder de gradiente, que é o comportamento sem foto). Nenhuma mudança obrigatória aqui além de garantir que o tipo aceita `cover_url` (já opcional).

- [ ] **Step 2: Preview detalhe passa galeria mock (usando o placeholder)**

Modify `src/app/preview/anuncio/[id]/page.tsx` — passar `media={[]}` e `coverUrl={null}` explicitamente ao `AdDetail` (mantém o placeholder de gradiente; a galeria só aparece com mídia real):
```tsx
<AdDetail ad={ad} now={new Date()} backHref="/preview"
  interactions={{ likeCount: ad.like_count ?? 0, liked: false, favorited: false, canInteract: true, loggedIn: true }}
  coverUrl={null} media={[]} />
```
> Observação: sem Storage no preview, capa/galeria reais aparecem só com backend (config Plano 5). O gestor de mídias é testado de verdade após a config.

- [ ] **Step 3: Build + suíte**

Run: `npm run build`
Expected: build ok.
Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/preview
git commit -m "chore(preview): capa/galeria (placeholder ate ter Storage)"
```

---

## Self-Review (cobertura da spec 3A)

- Limites/validação foto/vídeo: Task 2 ✔
- Upload direto pro Storage + path do dono + Storage RLS: Task 1 (bucket/policy) + Task 5 (upload) ✔
- Contagem por plano no servidor: Task 4 ✔
- Capa manual (is_cover, uma por anúncio): Task 1 + Task 4 (cover) + Task 5 ✔
- Apagar (Storage + linha): Task 4 ✔
- Galeria no detalhe + capa: Task 6 ✔
- Capa no card/home: Task 7 ✔
- Duração 60s no cliente: Task 5 ✔
- **Story:** Plano 3B (fora daqui).

## Placeholders
Nenhum. Preview usa placeholder de gradiente até haver Storage real (documentado).
