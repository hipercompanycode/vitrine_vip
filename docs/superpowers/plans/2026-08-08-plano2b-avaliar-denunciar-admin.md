# Plano 2B — Avaliar + Denunciar + Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usuário comum avalia (comentário opcional + selos) e denuncia anúncios; admin único (via ADMIN_EMAIL) modera denúncias no painel `/admin` (ocultar/reexibir, marcar revisada).

**Architecture:** Estende Plano 1 + 2A. Migration 0003 adiciona `reviews` e `reports` com RLS (só `role='comum'` cria; reviews leitura pública; reports leitura só do dono). Validadores puros (selos, motivos) em `lib/interactions.ts`. UI de avaliar/denunciar via **forms server-rendered** (checkboxes de selos; `<details>` para denúncia) — sem componentes client. Admin gated no servidor por e-mail, dados via service role.

**Tech Stack:** Next.js 16 (App Router, TS), Tailwind v4, Supabase (@supabase/ssr), Vitest.

## Global Constraints

- UI **pt-BR**.
- Selos (valor→rótulo): `igual_foto`→"Igual à foto", `nao_fake`→"Não é fake", `recomendo`→"Recomendo". Só esses 3.
- Motivos de denúncia (valor→rótulo): `fake`→"Fake/enganoso", `golpe`→"Golpe", `outro`→"Outro". Só esses 3.
- **Avaliação:** comentário opcional, selos opcionais, **várias por usuário** por anúncio, texto sem limite. Leitura pública.
- **Denúncia:** só do dono lê; admin lê via rota de servidor (service role). Não oculta automático.
- Só `role='comum'` autenticado cria review/report (RLS via `public.current_user_role()`).
- **Admin único** = usuário logado cujo e-mail == `process.env.ADMIN_EMAIL` (checado no servidor; senão 404/403). Ações admin via service role.
- `ads.status` `hidden` oculta o anúncio (regra do Plano 1 já filtra).
- Nomes de tabelas/colunas exatamente como na spec `docs/superpowers/specs/2026-08-08-usuarios-interacoes-design.md`.

---

## File Structure

```
supabase/migrations/0003_reviews_reports.sql
src/lib/interactions.ts + __tests__/interactions.test.ts   # selos + motivos (puro)
src/lib/admin.ts + __tests__/admin.test.ts                 # isAdmin(email, adminEmail)
src/app/api/review/route.ts            # POST cria avaliação
src/app/api/review/delete/route.ts     # POST apaga a própria
src/app/api/report/route.ts            # POST cria denúncia
src/app/api/admin/hide/route.ts        # POST ocultar/reexibir (gated ADMIN_EMAIL)
src/app/api/admin/report/route.ts      # POST marcar denúncia revisada (gated)
src/components/ReviewForm.tsx           # form server (comentário + selos)
src/components/ReviewList.tsx           # lista server (+ apagar a própria)
src/components/ReportButton.tsx         # <details> server com form de denúncia
src/app/anuncio/[id]/page.tsx (modify)  # carrega reviews; render lista/form/denúncia
src/app/admin/page.tsx                  # painel de denúncias (gated)
src/app/preview/anuncio/[id]/page.tsx (modify)  # mock de avaliações
src/app/preview/admin/page.tsx          # mock do painel admin
```

---

### Task 1: Migration 0003 — reviews + reports + RLS

**Files:**
- Create: `supabase/migrations/0003_reviews_reports.sql`

**Interfaces:**
- Consumes: `public.current_user_role()` (criado na 0002).
- Produces: tabelas `reviews`, `reports` + RLS. Aplicado na config (Plano 5).

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/0003_reviews_reports.sql`:
```sql
-- REVIEWS (avaliações: comentário opcional + selos; várias por usuário)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index reviews_ad_idx on public.reviews (ad_id, created_at desc);

-- REPORTS (denúncias)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake','golpe','outro')),
  details text,
  status text not null default 'open' check (status in ('open','reviewed')),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

alter table public.reviews enable row level security;
alter table public.reports enable row level security;

-- REVIEWS: leitura pública; dono (role comum) cria; dono apaga
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_owner_insert" on public.reviews for insert
  with check (auth.uid() = user_id and public.current_user_role() = 'comum');
create policy "reviews_owner_delete" on public.reviews for delete
  using (auth.uid() = user_id);

-- REPORTS: dono lê e cria (role comum). Admin lê/edita via service role (rota /admin).
create policy "reports_owner_read" on public.reports for select
  using (auth.uid() = user_id);
create policy "reports_owner_insert" on public.reports for insert
  with check (auth.uid() = user_id and public.current_user_role() = 'comum');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0003_reviews_reports.sql
git commit -m "feat(db): migration 0003 - reviews, reports, RLS"
```

---

### Task 2: lib/interactions.ts — selos + motivos (TDD)

**Files:**
- Create: `src/lib/interactions.ts`, `src/lib/__tests__/interactions.test.ts`

**Interfaces:**
- Produces:
  - `REVIEW_TAGS: { value: ReviewTag; label: string }[]`, `type ReviewTag = "igual_foto"|"nao_fake"|"recomendo"`
  - `sanitizeTags(input: string[]): ReviewTag[]` (dedup + só válidos)
  - `tagLabel(v: string): string` (rótulo ou o próprio valor)
  - `REPORT_REASONS: { value: ReportReason; label: string }[]`, `type ReportReason = "fake"|"golpe"|"outro"`
  - `isValidReason(r: string): r is ReportReason`
  - `reasonLabel(v: string): string`

- [ ] **Step 1: Teste falhando**

Create `src/lib/__tests__/interactions.test.ts`:
```ts
import { expect, test } from "vitest";
import { sanitizeTags, tagLabel, isValidReason, reasonLabel } from "../interactions";

test("sanitizeTags: mantém válidos, remove inválidos e duplicados", () => {
  expect(sanitizeTags(["igual_foto", "x", "recomendo", "igual_foto"])).toEqual(["igual_foto", "recomendo"]);
  expect(sanitizeTags([])).toEqual([]);
  expect(sanitizeTags(["nada"])).toEqual([]);
});

test("tagLabel traduz selo", () => {
  expect(tagLabel("nao_fake")).toBe("Não é fake");
  expect(tagLabel("desconhecido")).toBe("desconhecido");
});

test("isValidReason", () => {
  expect(isValidReason("fake")).toBe(true);
  expect(isValidReason("golpe")).toBe(true);
  expect(isValidReason("outro")).toBe(true);
  expect(isValidReason("nope")).toBe(false);
});

test("reasonLabel traduz motivo", () => {
  expect(reasonLabel("golpe")).toBe("Golpe");
  expect(reasonLabel("zzz")).toBe("zzz");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- interactions`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

Create `src/lib/interactions.ts`:
```ts
export type ReviewTag = "igual_foto" | "nao_fake" | "recomendo";

export const REVIEW_TAGS: { value: ReviewTag; label: string }[] = [
  { value: "igual_foto", label: "Igual à foto" },
  { value: "nao_fake", label: "Não é fake" },
  { value: "recomendo", label: "Recomendo" },
];

const TAG_SET = new Set<string>(REVIEW_TAGS.map((t) => t.value));

export function sanitizeTags(input: string[]): ReviewTag[] {
  const seen = new Set<string>();
  const out: ReviewTag[] = [];
  for (const t of input) {
    if (TAG_SET.has(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t as ReviewTag);
    }
  }
  return out;
}

export function tagLabel(v: string): string {
  return REVIEW_TAGS.find((t) => t.value === v)?.label ?? v;
}

export type ReportReason = "fake" | "golpe" | "outro";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "fake", label: "Fake/enganoso" },
  { value: "golpe", label: "Golpe" },
  { value: "outro", label: "Outro" },
];

export function isValidReason(r: string): r is ReportReason {
  return REPORT_REASONS.some((x) => x.value === r);
}

export function reasonLabel(v: string): string {
  return REPORT_REASONS.find((x) => x.value === v)?.label ?? v;
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- interactions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/interactions.ts src/lib/__tests__/interactions.test.ts
git commit -m "feat: validadores de selos e motivos (interactions)"
```

---

### Task 3: lib/admin.ts — isAdmin (TDD)

**Files:**
- Create: `src/lib/admin.ts`, `src/lib/__tests__/admin.test.ts`

**Interfaces:**
- Produces: `isAdmin(email: string | null | undefined, adminEmail: string | null | undefined): boolean` — true só se ambos existem e batem (case-insensitive, trim).

- [ ] **Step 1: Teste falhando**

Create `src/lib/__tests__/admin.test.ts`:
```ts
import { expect, test } from "vitest";
import { isAdmin } from "../admin";

test("isAdmin compara e-mail case-insensitive", () => {
  expect(isAdmin("Me@Ex.com", "me@ex.com")).toBe(true);
  expect(isAdmin("  me@ex.com ", "me@ex.com")).toBe(true);
  expect(isAdmin("other@ex.com", "me@ex.com")).toBe(false);
});

test("isAdmin falso quando falta e-mail ou config", () => {
  expect(isAdmin(null, "me@ex.com")).toBe(false);
  expect(isAdmin("me@ex.com", null)).toBe(false);
  expect(isAdmin("me@ex.com", "")).toBe(false);
  expect(isAdmin(undefined, undefined)).toBe(false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- admin`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Create `src/lib/admin.ts`:
```ts
export function isAdmin(
  email: string | null | undefined,
  adminEmail: string | null | undefined
): boolean {
  if (!email || !adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- admin`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin.ts src/lib/__tests__/admin.test.ts
git commit -m "feat: helper isAdmin (ADMIN_EMAIL)"
```

---

### Task 4: Rotas de avaliação — criar e apagar

**Files:**
- Create: `src/app/api/review/route.ts`, `src/app/api/review/delete/route.ts`

**Interfaces:**
- Consumes: `createServerClient`, `sanitizeTags`.
- Produces: `POST /api/review` (cria), `POST /api/review/delete` (apaga a própria). Ambos redirect 303 para `/anuncio/<ad_id>`.

- [ ] **Step 1: Criar avaliação**

Create `src/app/api/review/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sanitizeTags } from "@/lib/interactions";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const commentRaw = String(form.get("comment") ?? "").trim();
  const comment = commentRaw === "" ? null : commentRaw;
  const tags = sanitizeTags(form.getAll("tags").map((t) => String(t)));

  const { error } = await supabase.from("reviews").insert({
    ad_id: adId, user_id: user.id, comment, tags,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.redirect(new URL(`/anuncio/${adId}`, request.url), { status: 303 });
}
```

- [ ] **Step 2: Apagar a própria avaliação**

Create `src/app/api/review/delete/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const reviewId = String(form.get("review_id") ?? "");
  const adId = String(form.get("ad_id") ?? "");
  if (!reviewId) return NextResponse.json({ error: "review_id obrigatório" }, { status: 400 });

  await supabase.from("reviews").delete().eq("id", reviewId).eq("user_id", user.id);
  return NextResponse.redirect(new URL(`/anuncio/${adId}`, request.url), { status: 303 });
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/review
git commit -m "feat: rotas de avaliar (criar/apagar) com RLS por papel"
```

---

### Task 5: Rota de denúncia

**Files:**
- Create: `src/app/api/report/route.ts`

**Interfaces:**
- Consumes: `createServerClient`, `isValidReason`.
- Produces: `POST /api/report` — valida motivo, insere (RLS role comum), redirect 303 `/anuncio/<ad_id>`.

- [ ] **Step 1: Rota**

Create `src/app/api/report/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isValidReason } from "@/lib/interactions";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const reason = String(form.get("reason") ?? "");
  const detailsRaw = String(form.get("details") ?? "").trim();
  const details = detailsRaw === "" ? null : detailsRaw;

  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });
  if (!isValidReason(reason)) return NextResponse.json({ error: "motivo inválido" }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    ad_id: adId, user_id: user.id, reason, details,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.redirect(new URL(`/anuncio/${adId}`, request.url), { status: 303 });
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/report
git commit -m "feat: rota de denunciar (valida motivo, RLS por papel)"
```

---

### Task 6: Rotas admin — ocultar/reexibir e marcar revisada

**Files:**
- Create: `src/app/api/admin/hide/route.ts`, `src/app/api/admin/report/route.ts`

**Interfaces:**
- Consumes: `createServerClient` (identifica usuário), `createAdminClient` (escreve), `isAdmin`, `process.env.ADMIN_EMAIL`.
- Produces: `POST /api/admin/hide` (muda `ads.status`), `POST /api/admin/report` (marca denúncia `reviewed`). Gated por ADMIN_EMAIL; redirect 303 `/admin`.

- [ ] **Step 1: Ocultar/reexibir anúncio**

Create `src/app/api/admin/hide/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!adId || (status !== "hidden" && status !== "active")) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("ads").update({ status }).eq("id", adId);
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
```

- [ ] **Step 2: Marcar denúncia revisada**

Create `src/app/api/admin/report/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email, process.env.ADMIN_EMAIL)) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }

  const form = await request.formData();
  const reportId = String(form.get("report_id") ?? "");
  if (!reportId) return NextResponse.json({ error: "report_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("reports").update({ status: "reviewed" }).eq("id", reportId);
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin
git commit -m "feat: rotas admin (ocultar/reexibir, marcar denuncia revisada)"
```

---

### Task 7: UI de avaliações — ReviewForm + ReviewList + integração no detalhe

**Files:**
- Create: `src/components/ReviewForm.tsx`, `src/components/ReviewList.tsx`
- Modify: `src/app/anuncio/[id]/page.tsx`

**Interfaces:**
- Consumes: `REVIEW_TAGS`, `tagLabel`, `timeAgo`.
- Produces: seção de avaliações no detalhe (form quando `canInteract`; lista sempre).

- [ ] **Step 1: ReviewForm (server, form nativo)**

Create `src/components/ReviewForm.tsx`:
```tsx
import { REVIEW_TAGS } from "@/lib/interactions";

export default function ReviewForm({ adId }: { adId: string }) {
  return (
    <form action="/api/review" method="post" className="rounded-card border border-line bg-surface p-4 shadow-card">
      <input type="hidden" name="ad_id" value={adId} />
      <textarea name="comment" rows={3} placeholder="Escreva um comentário (opcional)"
        className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
      <div className="mt-3 flex flex-wrap gap-2">
        {REVIEW_TAGS.map((t) => (
          <label key={t.value}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-sm text-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent">
            <input type="checkbox" name="tags" value={t.value} className="accent-accent" />
            {t.label}
          </label>
        ))}
      </div>
      <button className="mt-3 rounded-input bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">
        Enviar avaliação
      </button>
    </form>
  );
}
```

- [ ] **Step 2: ReviewList (server)**

Create `src/components/ReviewList.tsx`:
```tsx
import { tagLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";

export type ReviewItem = {
  id: string;
  user_id: string;
  comment: string | null;
  tags: string[];
  created_at: string;
  authorName: string;
};

export default function ReviewList({
  reviews, now, currentUserId, adId,
}: { reviews: ReviewItem[]; now: Date; currentUserId: string | null; adId: string }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted">Nenhuma avaliação ainda.</p>;
  }
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{r.authorName || "Usuário"}</span>
            <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
          </div>
          {r.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.tags.map((t) => (
                <span key={t} className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {tagLabel(t)}
                </span>
              ))}
            </div>
          )}
          {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink/90">{r.comment}</p>}
          {currentUserId === r.user_id && (
            <form action="/api/review/delete" method="post" className="mt-2">
              <input type="hidden" name="review_id" value={r.id} />
              <input type="hidden" name="ad_id" value={adId} />
              <button className="text-xs text-muted underline hover:text-ink">Apagar</button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Integrar no detalhe** — carregar reviews e renderizar

Modify `src/app/anuncio/[id]/page.tsx`:

(a) imports:
```tsx
import ReviewForm from "@/components/ReviewForm";
import ReviewList, { type ReviewItem } from "@/components/ReviewList";
```

(b) depois de montar `interactions`, carregar as avaliações:
```tsx
const { data: reviewRows } = await admin
  .from("reviews")
  .select("id, user_id, comment, tags, created_at, profiles ( name )")
  .eq("ad_id", data.id)
  .order("created_at", { ascending: false });
const reviews: ReviewItem[] = (reviewRows ?? []).map((r: any) => ({
  id: r.id, user_id: r.user_id, comment: r.comment, tags: r.tags ?? [],
  created_at: r.created_at,
  authorName: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name ?? "",
}));
```

(c) passar via novo prop `reviewsBlock` ao `AdDetail` NÃO — em vez disso, renderizar a seção logo após `<AdDetail>`. Trocar o `return` para:
```tsx
return (
  <>
    <SiteHeader />
    <AdDetail ad={data} now={new Date()} backHref="/" interactions={interactions} />
    <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:pb-16">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">Avaliações</h2>
      {interactions.canInteract ? (
        <div className="mb-4"><ReviewForm adId={data.id} /></div>
      ) : (
        !interactions.loggedIn && (
          <p className="mb-4 text-sm text-muted">
            <a href="/login" className="text-accent underline">Entre como usuário</a> para avaliar.
          </p>
        )
      )}
      <ReviewList reviews={reviews} now={new Date()} currentUserId={user?.id ?? null} adId={data.id} />
    </section>
  </>
);
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build ok.
Run: `npm test`
Expected: PASS (interactions, admin, roles, etc.).

- [ ] **Step 5: Commit**

```bash
git add src/components/ReviewForm.tsx src/components/ReviewList.tsx src/app/anuncio/"[id]"/page.tsx
git commit -m "feat: avaliacoes no detalhe (form + lista + apagar)"
```

---

### Task 8: UI de denúncia — ReportButton no detalhe

**Files:**
- Create: `src/components/ReportButton.tsx`
- Modify: `src/app/anuncio/[id]/page.tsx`

**Interfaces:**
- Consumes: `REPORT_REASONS`.
- Produces: botão "Denunciar" (`<details>` nativo) com form; aparece só quando `canInteract`.

- [ ] **Step 1: ReportButton (server, <details>)**

Create `src/components/ReportButton.tsx`:
```tsx
import { REPORT_REASONS } from "@/lib/interactions";

export default function ReportButton({ adId }: { adId: string }) {
  return (
    <details className="rounded-card border border-line bg-surface p-3 shadow-card">
      <summary className="cursor-pointer list-none text-sm font-semibold text-muted hover:text-ink">
        ⚠ Denunciar anúncio
      </summary>
      <form action="/api/report" method="post" className="mt-3 space-y-2">
        <input type="hidden" name="ad_id" value={adId} />
        <select name="reason" required
          className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none">
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <textarea name="details" rows={2} placeholder="Detalhes (opcional)"
          className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
        <button className="rounded-input border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft">
          Enviar denúncia
        </button>
      </form>
    </details>
  );
}
```

- [ ] **Step 2: Integrar no detalhe** — dentro da seção de avaliações, antes do `<h2>Avaliações`, adicionar o botão quando `canInteract`:

Modify `src/app/anuncio/[id]/page.tsx` — no import:
```tsx
import ReportButton from "@/components/ReportButton";
```
E dentro da `<section>` (Task 7 Step 3c), como primeiro filho:
```tsx
{interactions.canInteract && (
  <div className="mb-6"><ReportButton adId={data.id} /></div>
)}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/components/ReportButton.tsx src/app/anuncio/"[id]"/page.tsx
git commit -m "feat: botao de denunciar no detalhe"
```

---

### Task 9: Painel /admin

**Files:**
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `createServerClient`, `createAdminClient`, `isAdmin`, `reasonLabel`, `timeAgo`, `process.env.ADMIN_EMAIL`.
- Produces: rota `/admin` (404 se não for admin) com fila de denúncias + ações.

- [ ] **Step 1: Página**

Create `src/app/admin/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { reasonLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email, process.env.ADMIN_EMAIL)) notFound();

  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("reports")
    .select("id, reason, details, status, created_at, ad_id, ads ( title, status )")
    .order("created_at", { ascending: false });

  const now = new Date();
  const rows = (reports ?? []) as any[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Denúncias
      </h1>
      {rows.length === 0 ? (
        <p className="text-muted">Nenhuma denúncia.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const ad = Array.isArray(r.ads) ? r.ads[0] : r.ads;
            const hidden = ad?.status === "hidden";
            return (
              <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                    {reasonLabel(r.reason)}
                  </span>
                  <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
                </div>
                <Link href={`/anuncio/${r.ad_id}`} className="mt-2 block font-semibold text-ink underline">
                  {ad?.title ?? "(anúncio removido)"}
                </Link>
                {r.details && <p className="mt-1 text-sm text-muted">{r.details}</p>}
                <div className="mt-1 text-xs text-muted">
                  status anúncio: {hidden ? "oculto" : "ativo"} · denúncia: {r.status}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action="/api/admin/hide" method="post">
                    <input type="hidden" name="ad_id" value={r.ad_id} />
                    <input type="hidden" name="status" value={hidden ? "active" : "hidden"} />
                    <button className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-accent-soft">
                      {hidden ? "Reexibir anúncio" : "Ocultar anúncio"}
                    </button>
                  </form>
                  {r.status === "open" && (
                    <form action="/api/admin/report" method="post">
                      <input type="hidden" name="report_id" value={r.id} />
                      <button className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink">
                        Marcar revisada
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Build check + suíte**

Run: `npm run build`
Expected: build ok, rota `/admin` presente.
Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: painel /admin (fila de denuncias + ocultar/reexibir)"
```

---

### Task 10: Preview — avaliações mock + painel admin mock

**Files:**
- Modify: `src/app/preview/anuncio/[id]/page.tsx`
- Create: `src/app/preview/admin/page.tsx`

**Interfaces:**
- Produces: preview do detalhe mostra seção de avaliações (mock) e botão denunciar (visual); `/preview/admin` mostra a fila mock.

- [ ] **Step 1: Preview detalhe com avaliações mock**

Modify `src/app/preview/anuncio/[id]/page.tsx` — após o `<AdDetail ...>`, adicionar uma seção estática (dados fake) reproduzindo a lista de avaliações e o botão denunciar. Importar os componentes e montar 2 avaliações fake:
```tsx
import ReviewForm from "@/components/ReviewForm";
import ReviewList, { type ReviewItem } from "@/components/ReviewList";
import ReportButton from "@/components/ReportButton";
// ...
const reviews: ReviewItem[] = [
  { id: "r1", user_id: "u1", comment: "Chegou no horário, serviço impecável.", tags: ["igual_foto", "recomendo"], created_at: new Date(Date.now() - 3600_000).toISOString(), authorName: "Ana P." },
  { id: "r2", user_id: "u2", comment: "", tags: ["nao_fake"], created_at: new Date(Date.now() - 86400_000).toISOString(), authorName: "João M." },
];
```
E depois do `<AdDetail>` (dentro do fragment) adicionar:
```tsx
<section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:pb-16">
  <div className="mb-6"><ReportButton adId={ad.id} /></div>
  <h2 className="mb-3 font-display text-lg font-bold text-ink">Avaliações</h2>
  <div className="mb-4"><ReviewForm adId={ad.id} /></div>
  <ReviewList reviews={reviews} now={new Date()} currentUserId="u1" adId={ad.id} />
</section>
```

- [ ] **Step 2: Preview admin mock**

Create `src/app/preview/admin/page.tsx`:
```tsx
import Link from "next/link";
import PreviewNav from "@/components/PreviewNav";
import { reasonLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const MOCK = [
  { id: "1", reason: "fake", details: "As fotos não são do serviço real.", status: "open", created_at: new Date(Date.now() - 7200_000).toISOString(), ad_id: "3", adTitle: "Diarista / Faxina completa", adHidden: false },
  { id: "2", reason: "golpe", details: "Pediu pagamento adiantado e sumiu.", status: "open", created_at: new Date(Date.now() - 172800_000).toISOString(), ad_id: "8", adTitle: "Fotógrafo para eventos", adHidden: true },
];

export default function PreviewAdminPage() {
  const now = new Date();
  return (
    <>
      <PreviewNav active="home" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Denúncias (preview)</h1>
        <ul className="space-y-3">
          {MOCK.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{reasonLabel(r.reason)}</span>
                <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
              </div>
              <Link href={`/preview/anuncio/${r.ad_id}`} className="mt-2 block font-semibold text-ink underline">{r.adTitle}</Link>
              <p className="mt-1 text-sm text-muted">{r.details}</p>
              <div className="mt-1 text-xs text-muted">status anúncio: {r.adHidden ? "oculto" : "ativo"} · denúncia: {r.status}</div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-ink">{r.adHidden ? "Reexibir anúncio" : "Ocultar anúncio"}</span>
                <span className="rounded-input border border-line px-3 py-1.5 text-sm font-semibold text-muted">Marcar revisada</span>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Build + suíte**

Run: `npm run build`
Expected: build ok.
Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/preview
git commit -m "chore(preview): avaliacoes mock no detalhe + painel admin mock"
```

---

## Self-Review (cobertura da spec 2B)

- Avaliar (comentário opcional + selos, várias, público): Tasks 1,2,4,7 ✔
- Apagar a própria avaliação: Task 4,7 ✔
- Denunciar (motivos, RLS, só dono lê): Tasks 1,2,5,8 ✔
- Admin único via ADMIN_EMAIL: Tasks 3,6,9 ✔
- Painel /admin (fila, ocultar/reexibir, marcar revisada): Tasks 6,9 ✔
- Preview: Task 10 ✔
- Curtir/favoritar/papéis: **Plano 2A** (já feito).

## Placeholders
Nenhum. As seções de detalhe reaproveitam blocos existentes; todo passo mostra o código.

## Dívida técnica registrada (aceita no review final, adiada)
- **CSRF:** rotas POST usam `<form>` nativo sem token CSRF; proteção depende do cookie `SameSite=Lax` padrão do `@supabase/ssr` (bloqueia POST cross-site com cookie de auth). Padrão do codebase inteiro. Reavaliar se um dia precisar de POST cross-site.
- **Índices:** `reviews.user_id` / `reports.user_id` sem índice próprio — adicionar quando existir listagem "minhas avaliações/denúncias" por usuário.
- **Admin:** gate exige `email_confirmed_at` (corrigido); manter confirmação de e-mail LIGADA no Supabase (config Plano 5).
