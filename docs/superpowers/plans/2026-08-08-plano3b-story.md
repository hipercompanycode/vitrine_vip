# Plano 3B — Story 24h — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Anunciante Pro/Premium envia um vídeo de 24h (story); no card e no detalhe aparece um botão de play sobre a capa e, ao tocar, o story roda no lugar da capa (inline). Some após 24h.

**Architecture:** A tabela `stories` e sua RLS já existem (0001, leitura pública gated por `is_ad_visible` + `expires_at>now()`; escrita do dono). O vídeo do story reaproveita o bucket `ad-media` (path `{uid}/{adId}/story-{uuid}.ext`) — sem novo bucket. Upload direto do navegador; rota `/api/story` registra (gated por `allows_story` do plano) e substitui o story anterior. `StoryCover` (client) troca a capa pelo vídeo ao tocar no play.

**Tech Stack:** Next.js 16, Tailwind v4, Supabase (Storage), Vitest.

## Global Constraints
- UI pt-BR. Story = **1 vídeo por anúncio**, ≤60s, ≤150MB (mp4/webm). Novo substitui o anterior. `expires_at = created_at + 24h`.
- Só planos **Pro/Premium** (`plans.allows_story = true`) enviam story.
- Vídeo do story no bucket `ad-media`, path `{user_id}/{ad_id}/story-{uuid}.ext` (bate com Storage RLS de prefixo do dono).
- Story NÃO conta no limite de vídeos do anúncio (fica em `stories`, não `ad_media`).
- Service-role nunca no client. Duração ≤60s validada no cliente.
- **Sem migration nova.**

## File Structure
```
src/lib/story.ts + __tests__/story.test.ts     # isStoryActive, STORY_MAX_SECONDS (puro)
src/app/api/story/route.ts                      # POST cria/substitui story (gated allows_story)
src/app/api/story/delete/route.ts               # POST remove story
src/components/StoryCover.tsx                    # client: capa + play inline
src/components/StoryManager.tsx                  # client: upload/remover story (painel)
src/components/AdCard.tsx (modify)              # story_url → StoryCover
src/components/AdDetail.tsx (modify)           # storyUrl → StoryCover na capa
src/app/anuncio/[id]/page.tsx (modify)         # carrega story ativo
src/app/page.tsx (modify)                      # carrega story_url por anúncio
src/app/perfil/page.tsx (modify)               # StoryManager quando allows_story
src/app/preview/* (modify)                     # mock story
```

---

### Task 1: lib/story.ts (TDD)

**Files:** Create `src/lib/story.ts`, `src/lib/__tests__/story.test.ts`

**Interfaces:** `STORY_MAX_SECONDS = 60`; `isStoryActive(expiresAt: string | Date, now: Date): boolean`.

- [ ] **Step 1: Teste falhando** — Create `src/lib/__tests__/story.test.ts`:
```ts
import { expect, test } from "vitest";
import { isStoryActive, STORY_MAX_SECONDS } from "../story";

const now = new Date("2026-08-08T12:00:00Z");
test("ativo antes de expirar", () => {
  expect(isStoryActive("2026-08-08T13:00:00Z", now)).toBe(true);
  expect(isStoryActive(new Date("2026-08-08T12:00:01Z"), now)).toBe(true);
});
test("inativo no/após expirar", () => {
  expect(isStoryActive("2026-08-08T12:00:00Z", now)).toBe(false);
  expect(isStoryActive("2026-08-08T11:59:59Z", now)).toBe(false);
});
test("limite 60s", () => { expect(STORY_MAX_SECONDS).toBe(60); });
```

- [ ] **Step 2: RED** — Run `npm test -- story` → FAIL.

- [ ] **Step 3: Implementar** — Create `src/lib/story.ts`:
```ts
export const STORY_MAX_SECONDS = 60;

export function isStoryActive(expiresAt: string | Date, now: Date): boolean {
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return exp.getTime() > now.getTime();
}
```

- [ ] **Step 4: GREEN** — Run `npm test -- story` → PASS. Then `npm test`.

- [ ] **Step 5: Commit**
```bash
git add src/lib/story.ts src/lib/__tests__/story.test.ts
git commit -m "feat: helper de story (isStoryActive)"
```

---

### Task 2: Rotas /api/story (criar/substituir, apagar)

**Files:** Create `src/app/api/story/route.ts`, `src/app/api/story/delete/route.ts`

**Interfaces:** Consumes createServerClient/createAdminClient. `POST /api/story` (form ad_id, storage_path) → gated allows_story; substitui anterior; {id}. `POST /api/story/delete` (form ad_id) → remove.

- [ ] **Step 1: Criar/substituir** — Create `src/app/api/story/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const storagePath = String(form.get("storage_path") ?? "");
  if (!adId || !storagePath) return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  if (!storagePath.startsWith(`${user.id}/${adId}/`)) {
    return NextResponse.json({ error: "caminho inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("id, profile_id").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  // plano permite story?
  const { data: sub } = await admin
    .from("subscriptions").select("plans ( allows_story )")
    .eq("profile_id", user.id).eq("status", "active").gt("current_period_end", new Date().toISOString()).maybeSingle();
  const allowsStory = (sub?.plans as unknown as { allows_story: boolean } | null)?.allows_story ?? false;
  if (!allowsStory) return NextResponse.json({ error: "seu plano não inclui story" }, { status: 403 });

  // substitui o anterior (remove objetos + linhas)
  const { data: olds } = await admin.from("stories").select("id, storage_path").eq("ad_id", adId);
  for (const o of olds ?? []) {
    await admin.storage.from("ad-media").remove([o.storage_path as string]);
  }
  if ((olds ?? []).length) await admin.from("stories").delete().eq("ad_id", adId);

  const { data: inserted, error } = await admin
    .from("stories").insert({ ad_id: adId, storage_path: storagePath }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: inserted.id });
}
```

- [ ] **Step 2: Apagar** — Create `src/app/api/story/delete/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("profile_id").eq("id", adId).maybeSingle();
  if (!ad || ad.profile_id !== user.id) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const { data: olds } = await admin.from("stories").select("storage_path").eq("ad_id", adId);
  for (const o of olds ?? []) await admin.storage.from("ad-media").remove([o.storage_path as string]);
  await admin.from("stories").delete().eq("ad_id", adId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Build check** — `npm run build` → ok.
- [ ] **Step 4: Commit**
```bash
git add src/app/api/story
git commit -m "feat: rotas de story (criar/substituir gated por plano, apagar)"
```

---

### Task 3: StoryCover (client) — capa + play inline

**Files:** Create `src/components/StoryCover.tsx`

**Interfaces:** `<StoryCover title coverUrl storyUrl className />` — mostra capa (img/placeholder); se storyUrl, botão play; ao tocar, roda `<video>` no lugar.

- [ ] **Step 1: Componente** — Create `src/components/StoryCover.tsx`:
```tsx
"use client";
import { useState } from "react";
import CardMediaPlaceholder from "./CardMediaPlaceholder";

export default function StoryCover({
  title, coverUrl, storyUrl, className = "",
}: { title: string; coverUrl?: string | null; storyUrl?: string | null; className?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {playing && storyUrl ? (
        <video
          src={storyUrl}
          autoPlay
          playsInline
          controls
          onEnded={() => setPlaying(false)}
          className="absolute inset-0 z-20 h-full w-full bg-black object-contain"
        />
      ) : (
        <>
          {coverUrl ? (
            <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <CardMediaPlaceholder title={title} className="h-full w-full" />
          )}
          {storyUrl && (
            <button
              type="button"
              aria-label="Reproduzir story"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying(true); }}
              className="absolute inset-0 z-20 flex items-center justify-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/60 text-white ring-2 ring-white/80 backdrop-blur transition-transform hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check** — `npm run build` → ok.
- [ ] **Step 3: Commit**
```bash
git add src/components/StoryCover.tsx
git commit -m "feat: StoryCover (capa com play inline)"
```

---

### Task 4: Card + home usam StoryCover/story

**Files:** Modify `src/components/AdCard.tsx`, `src/app/page.tsx`

- [ ] **Step 1: AdCard** — Modify `src/components/AdCard.tsx`:
- Import: `import StoryCover from "./StoryCover";`
- No tipo `AdCardData`: adicionar `story_url?: string | null;`
- Trocar o bloco da mídia (o `{ad.cover_url ? <img> : <CardMediaPlaceholder>}`) por:
```tsx
<StoryCover title={ad.title} coverUrl={ad.cover_url} storyUrl={ad.story_url} className="aspect-[4/3] w-full" />
```
(mantém as badges de disponível/tempo/curtidas como estão, logo após).

- [ ] **Step 2: Home carrega story ativo** — Modify `src/app/page.tsx`, no bloco pós-`ads` (junto de like_count/cover), adicionar:
```tsx
if (ads.length > 0) {
  const ids2 = ads.map((a) => a.id);
  const nowIso2 = new Date().toISOString();
  const { data: stories } = await admin
    .from("stories").select("ad_id, storage_path").in("ad_id", ids2).gt("expires_at", nowIso2);
  const byAdStory = new Map<string, string>();
  (stories ?? []).forEach((s: { ad_id: string; storage_path: string }) => {
    if (!byAdStory.has(s.ad_id)) byAdStory.set(s.ad_id, publicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, "ad-media", s.storage_path));
  });
  ads.forEach((a) => { a.story_url = byAdStory.get(a.id) ?? null; });
}
```
> `publicUrl` já é importado estático no topo (Plano 3A). Mantém os blocos de like_count/cover.

- [ ] **Step 3: Build check** — `npm run build` → ok. `npm test` → PASS.
- [ ] **Step 4: Commit**
```bash
git add src/components/AdCard.tsx src/app/page.tsx
git commit -m "feat: story no card e na home"
```

---

### Task 5: Detalhe usa StoryCover/story

**Files:** Modify `src/components/AdDetail.tsx`, `src/app/anuncio/[id]/page.tsx`

- [ ] **Step 1: AdDetail** — Modify `src/components/AdDetail.tsx`:
- Import: `import StoryCover from "./StoryCover";`
- Adicionar prop opcional `storyUrl?: string | null;` ao tipo.
- Trocar o bloco da capa (o `{coverUrl ? <img> : <CardMediaPlaceholder>}` dentro do `<div className="relative overflow-hidden rounded-card ...">`) por:
```tsx
<StoryCover title={ad.title} coverUrl={coverUrl} storyUrl={storyUrl} className="aspect-[16/10] w-full" />
```
(mantém badge de disponível + tempo como estão).

- [ ] **Step 2: Detalhe carrega story ativo** — Modify `src/app/anuncio/[id]/page.tsx`, após carregar `media`/`coverUrl`, adicionar:
```tsx
const { data: story } = await admin
  .from("stories").select("storage_path").eq("ad_id", data.id).gt("expires_at", new Date().toISOString())
  .order("created_at", { ascending: false }).limit(1).maybeSingle();
const storyUrl = story ? publicUrl(base, "ad-media", story.storage_path) : null;
```
E passar `storyUrl={storyUrl}` ao `<AdDetail ...>`.

- [ ] **Step 3: Build check** — `npm run build` → ok.
- [ ] **Step 4: Commit**
```bash
git add src/components/AdDetail.tsx src/app/anuncio/"[id]"/page.tsx
git commit -m "feat: story no detalhe (play na capa)"
```

---

### Task 6: StoryManager (client) + painel (Pro/Premium)

**Files:** Create `src/components/StoryManager.tsx`; Modify `src/app/perfil/page.tsx`

- [ ] **Step 1: StoryManager** — Create `src/components/StoryManager.tsx`:
```tsx
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
```

- [ ] **Step 2: Painel** — Modify `src/app/perfil/page.tsx`:
- Import: `import StoryManager from "@/components/StoryManager";`
- Após carregar `ad`/`media`, carregar plano (allows_story) + story ativo:
```tsx
let allowsStory = false;
let hasStory = false;
if (ad) {
  const [{ data: sub }, { data: st }] = await Promise.all([
    admin.from("subscriptions").select("plans ( allows_story )").eq("profile_id", user.id).eq("status", "active").gt("current_period_end", new Date().toISOString()).maybeSingle(),
    admin.from("stories").select("id").eq("ad_id", ad.id).gt("expires_at", new Date().toISOString()).maybeSingle(),
  ]);
  allowsStory = (sub?.plans as unknown as { allows_story: boolean } | null)?.allows_story ?? false;
  hasStory = !!st;
}
```
- Adicionar seção (após "Fotos e vídeos") quando `ad && allowsStory`:
```tsx
{ad && allowsStory && (
  <section className={cardCls}>
    <h2 className="mb-2 font-display text-base font-bold text-ink">Story 24h</h2>
    <StoryManager adId={ad.id} userId={user.id} hasStory={hasStory} />
  </section>
)}
```

- [ ] **Step 3: Build check** — `npm run build` → ok. `npm test` → PASS.
- [ ] **Step 4: Commit**
```bash
git add src/components/StoryManager.tsx src/app/perfil/page.tsx
git commit -m "feat: StoryManager no painel (Pro/Premium)"
```

---

### Task 7: Preview (mock story)

**Files:** Modify `src/app/preview/mock.ts`, `src/app/preview/page.tsx` (ou anuncio)

- [ ] **Step 1: Mock** — Modify `src/app/preview/mock.ts`: no primeiro anúncio (id "1") adicionar `story_url` apontando para um vídeo público de exemplo curto OU deixar `null` (sem Storage). Para não depender de rede/CSP, deixe `story_url: null` e apenas confirme que o tipo aceita. (O botão de play só aparece com story real.)

> Observação: no preview não há vídeo real; o play do story só aparece com Storage real. Sem mudança obrigatória além de garantir o tipo `story_url?` em AdCardData (já opcional).

- [ ] **Step 2: Build + suíte** — `npm run build` → ok. `npm test` → PASS.
- [ ] **Step 3: Commit**
```bash
git add src/app/preview
git commit -m "chore(preview): tipo story_url (play so com Storage real)"
```

---

## Self-Review (cobertura da spec — story)
- Story só Pro/Premium (allows_story): Task 2 (rota gated) + Task 6 (painel gate) ✔
- Vídeo 24h, substitui anterior, expira: Task 2 ✔
- Play na capa, roda no lugar (card + detalhe): Tasks 3,4,5 ✔
- Duração ≤60s no cliente: Task 6 ✔
- Reaproveita bucket ad-media (path story-*): Task 2/6 ✔
- **Sem migration** (stories + RLS já aplicadas).

## Placeholders
Nenhum. Preview sem vídeo real é documentado (play só com Storage).

## Desvio registrado
Spec §4 citava bucket separado `stories`; o plano **reaproveita `ad-media`** (mesmo dono/prefixo/RLS), evitando um segundo bucket. O registro do story continua na tabela `stories`.
