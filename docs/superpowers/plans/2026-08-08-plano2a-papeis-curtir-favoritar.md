# Plano 2A — Papéis + Curtir/Favoritar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar papéis de conta (Anunciante/Comum) no cadastro sem Google, e as interações **curtir** (contador estilo Instagram) e **favoritar** (lista privada) para o usuário comum, com página `/conta` de favoritos.

**Architecture:** Estende o app Next.js/Supabase do Plano 1. Migration 0002 adiciona `profiles.role` e as tabelas `likes`/`favorites` com RLS que só permite interação a `role='comum'`. Toggles via rotas de servidor (sessão do usuário → RLS aplica). Componentes client fazem toggle otimista chamando as rotas. Contagens lidas no servidor.

**Tech Stack:** Next.js 16 (App Router, TS), Tailwind v4, Supabase (@supabase/ssr), Vitest.

## Global Constraints

- UI em **pt-BR**.
- Papéis de cadastro: **`anunciante`** ou **`comum`** (fixo). `profiles.role` guarda.
- **Login só e-mail/senha — Google removido.**
- **Admin** = único, via env `ADMIN_EMAIL` (usado no Plano 2B; aqui só adicionar ao `.env.example`).
- `likes` e `favorites`: **UNIQUE(ad_id, user_id)**, alternam (toggle).
- Só `role='comum'` autenticado interage; anunciante e visitante não.
- `likes`: leitura pública (contagem). `favorites`: leitura só do dono.
- Anúncio segue visível só com assinatura ativa (regra do Plano 1) — não muda aqui.
- Nomes de tabelas/colunas exatamente como na spec `docs/superpowers/specs/2026-08-08-usuarios-interacoes-design.md`.

---

## File Structure

```
supabase/migrations/0002_users_interactions.sql   # role + likes + favorites + RLS + trigger
src/lib/roles.ts                                   # tipos e helper canInteract (puro)
src/lib/__tests__/roles.test.ts
src/app/login/page.tsx        (modify)             # remove Google; add seletor de papel no cadastro
src/app/api/like/route.ts                          # POST toggle like
src/app/api/favorite/route.ts                      # POST toggle favorite
src/components/LikeButton.tsx                       # client: toggle otimista
src/components/FavoriteButton.tsx                   # client: toggle otimista
src/components/AdCard.tsx      (modify)             # exibe contador de curtidas
src/components/AdDetail.tsx    (modify)             # exibe Like/Favorite + contador
src/app/anuncio/[id]/page.tsx (modify)             # carrega contagem + estado do usuário
src/app/page.tsx              (modify)             # carrega like_count por anúncio
src/app/conta/page.tsx                             # lista de favoritos (usuário comum)
src/app/preview/*             (modify)             # mock com contador/botões
.env.example                  (modify)             # + ADMIN_EMAIL
```

---

### Task 1: Migration 0002 — role + likes + favorites + RLS

**Files:**
- Create: `supabase/migrations/0002_users_interactions.sql`

**Interfaces:**
- Produces: coluna `profiles.role`; tabelas `likes`, `favorites`; RLS; trigger atualizado que copia `role` do metadata do signup. Aplicado no Supabase na config (Plano 5) — aqui só autoria.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/0002_users_interactions.sql`:
```sql
-- PAPEL no perfil
alter table public.profiles
  add column if not exists role text not null default 'comum'
  check (role in ('anunciante','comum'));

-- Helper: papel do usuário atual (SECURITY DEFINER evita recursão de RLS em profiles)
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- LIKES (curtidas)
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (ad_id, user_id)
);
create index likes_ad_idx on public.likes (ad_id);

-- FAVORITES
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (ad_id, user_id)
);
create index favorites_user_idx on public.favorites (user_id, created_at desc);

alter table public.likes     enable row level security;
alter table public.favorites enable row level security;

-- LIKES: leitura pública (para contagem); escrita só do dono E papel comum
create policy "likes_public_read" on public.likes for select using (true);
create policy "likes_owner_insert" on public.likes for insert
  with check (auth.uid() = user_id and public.current_role() = 'comum');
create policy "likes_owner_delete" on public.likes for delete
  using (auth.uid() = user_id);

-- FAVORITES: leitura/escrita só do dono E papel comum p/ inserir
create policy "favorites_owner_read" on public.favorites for select
  using (auth.uid() = user_id);
create policy "favorites_owner_insert" on public.favorites for insert
  with check (auth.uid() = user_id and public.current_role() = 'comum');
create policy "favorites_owner_delete" on public.favorites for delete
  using (auth.uid() = user_id);

-- Trigger de novo usuário: copia role do metadata (default 'comum')
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'role', 'comum'))
  on conflict (id) do nothing;
  return new;
end; $$;
```

- [ ] **Step 2: Commit** (aplicação no Supabase é na config)

```bash
git add supabase/migrations/0002_users_interactions.sql
git commit -m "feat(db): migration 0002 - role, likes, favorites, RLS"
```

---

### Task 2: lib/roles.ts — tipos + canInteract (TDD)

**Files:**
- Create: `src/lib/roles.ts`, `src/lib/__tests__/roles.test.ts`

**Interfaces:**
- Produces:
  - `type Role = "anunciante" | "comum"`
  - `canInteract(role: Role | null | undefined): boolean` — true só para `"comum"`.

- [ ] **Step 1: Teste falhando**

Create `src/lib/__tests__/roles.test.ts`:
```ts
import { expect, test } from "vitest";
import { canInteract } from "../roles";

test("só comum interage", () => {
  expect(canInteract("comum")).toBe(true);
  expect(canInteract("anunciante")).toBe(false);
  expect(canInteract(null)).toBe(false);
  expect(canInteract(undefined)).toBe(false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- roles`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

Create `src/lib/roles.ts`:
```ts
export type Role = "anunciante" | "comum";

export function canInteract(role: Role | null | undefined): boolean {
  return role === "comum";
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- roles`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roles.ts src/lib/__tests__/roles.test.ts
git commit -m "feat: helper de papel (canInteract)"
```

---

### Task 3: Login/cadastro — remover Google + seletor de papel

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `createBrowserClient`.
- Produces: cadastro envia `options.data.role` ('anunciante'|'comum'); sem botão Google.

- [ ] **Step 1: Reescrever a página**

Replace `src/app/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";

type Role = "comum" | "anunciante";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<Role>("comum");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "info">("info");
  const [loading, setLoading] = useState<"" | "entrar" | "cadastrar">("");
  const busy = loading !== "";

  async function entrar() {
    setLoading("entrar");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setMsgType("error");
      setMsg(error.message);
      setLoading("");
    } else {
      window.location.href = "/";
    }
  }

  async function cadastrar() {
    setLoading("cadastrar");
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setMsgType(error ? "error" : "info");
    setMsg(error ? error.message : "Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.");
    setLoading("");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">serviços</span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Entrar ou criar conta</h1>
          <p className="mt-1 text-sm text-muted">Anuncie um serviço ou interaja com anúncios.</p>

          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); entrar(); }}>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" placeholder="voce@email.com"
                className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Senha</span>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password" placeholder="••••••••"
                className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
            </label>

            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Ao criar conta, você é:</span>
              <div className="grid grid-cols-2 gap-2">
                {([["comum", "Usuário"], ["anunciante", "Anunciante"]] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setRole(val)}
                    className={`rounded-input border px-3 py-2 text-sm font-semibold transition-colors ${
                      role === val ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {role === "anunciante" ? "Publica 1 anúncio (assinatura)." : "Curte, favorita, avalia e denuncia anúncios."}
              </p>
            </div>

            <button type="submit" disabled={busy}
              className="w-full rounded-input bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60">
              {loading === "entrar" ? "Entrando…" : "Entrar"}
            </button>
            <button type="button" onClick={cadastrar} disabled={busy}
              className="w-full rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft disabled:opacity-60">
              {loading === "cadastrar" ? "Criando…" : "Criar conta"}
            </button>
          </form>

          {msg && (
            <p className={`mt-4 rounded-input px-3 py-2 text-sm ${msgType === "error" ? "bg-red-50 text-red-700" : "bg-accent-soft text-accent-strong"}`}>
              {msg}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build ok, sem referência a `signInWithOAuth`/Google.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: cadastro com papel (comum/anunciante), remove Google"
```

---

### Task 4: Rotas de toggle — like e favorite

**Files:**
- Create: `src/app/api/like/route.ts`, `src/app/api/favorite/route.ts`

**Interfaces:**
- Consumes: `createServerClient` (sessão do usuário → RLS aplica papel).
- Produces: `POST /api/like` e `POST /api/favorite` com body form `ad_id`; alternam e retornam JSON `{ active: boolean }`. RLS bloqueia se não for `comum`.

- [ ] **Step 1: Rota de like**

Create `src/app/api/like/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const { data: existing } = await supabase
    .from("likes").select("id").eq("ad_id", adId).eq("user_id", user.id).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ active: false });
  }
  const { error } = await supabase.from("likes").insert({ ad_id: adId, user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ active: true });
}
```

- [ ] **Step 2: Rota de favorite** (mesma forma, tabela `favorites`)

Create `src/app/api/favorite/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const { data: existing } = await supabase
    .from("favorites").select("id").eq("ad_id", adId).eq("user_id", user.id).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ active: false });
  }
  const { error } = await supabase.from("favorites").insert({ ad_id: adId, user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ active: true });
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/like src/app/api/favorite
git commit -m "feat: rotas de toggle curtir/favoritar (RLS por papel)"
```

---

### Task 5: Botões client — LikeButton e FavoriteButton

**Files:**
- Create: `src/components/LikeButton.tsx`, `src/components/FavoriteButton.tsx`

**Interfaces:**
- Consumes: `POST /api/like`, `POST /api/favorite`.
- Produces:
  - `<LikeButton adId, initialActive, initialCount, canInteract, loggedIn />`
  - `<FavoriteButton adId, initialActive, canInteract, loggedIn />`
  - Sem login → clique manda para `/login`. Sem papel comum → desabilitado com dica.

- [ ] **Step 1: LikeButton**

Create `src/components/LikeButton.tsx`:
```tsx
"use client";
import { useState } from "react";

export default function LikeButton({
  adId, initialActive, initialCount, canInteract, loggedIn,
}: { adId: string; initialActive: boolean; initialCount: number; canInteract: boolean; loggedIn: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) { window.location.href = "/login"; return; }
    if (!canInteract || busy) return;
    setBusy(true);
    const prev = active;
    setActive(!prev);
    setCount((c) => c + (prev ? -1 : 1));
    const body = new FormData();
    body.set("ad_id", adId);
    const res = await fetch("/api/like", { method: "POST", body });
    if (!res.ok) { setActive(prev); setCount((c) => c + (prev ? 1 : -1)); }
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy || (loggedIn && !canInteract)}
      title={loggedIn && !canInteract ? "Apenas usuários comuns podem curtir" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
      } disabled:opacity-50`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" />
      </svg>
      {count}
    </button>
  );
}
```

- [ ] **Step 2: FavoriteButton**

Create `src/components/FavoriteButton.tsx`:
```tsx
"use client";
import { useState } from "react";

export default function FavoriteButton({
  adId, initialActive, canInteract, loggedIn,
}: { adId: string; initialActive: boolean; canInteract: boolean; loggedIn: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) { window.location.href = "/login"; return; }
    if (!canInteract || busy) return;
    setBusy(true);
    const prev = active;
    setActive(!prev);
    const body = new FormData();
    body.set("ad_id", adId);
    const res = await fetch("/api/favorite", { method: "POST", body });
    if (!res.ok) setActive(prev);
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy || (loggedIn && !canInteract)}
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
      } disabled:opacity-50`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      {active ? "Salvo" : "Favoritar"}
    </button>
  );
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/components/LikeButton.tsx src/components/FavoriteButton.tsx
git commit -m "feat: botoes client de curtir e favoritar (toggle otimista)"
```

---

### Task 6: Detalhe — carregar estado/contagem e renderizar botões

**Files:**
- Modify: `src/app/anuncio/[id]/page.tsx`, `src/components/AdDetail.tsx`

**Interfaces:**
- Consumes: `createServerClient`, `createAdminClient`, `LikeButton`, `FavoriteButton`, `canInteract`.
- Produces: detalhe mostra Curtir (contador) + Favoritar, refletindo o estado do usuário.

- [ ] **Step 1: AdDetail aceita props de interação**

Modify `src/components/AdDetail.tsx` — adicionar props e render. Adicionar ao tipo de props:
```tsx
import LikeButton from "./LikeButton";
import FavoriteButton from "./FavoriteButton";
// ...
export default function AdDetail({
  ad, now, backHref = "/", interactions,
}: {
  ad: AdCardData; now: Date; backHref?: string;
  interactions?: {
    likeCount: number; liked: boolean; favorited: boolean;
    canInteract: boolean; loggedIn: boolean;
  };
}) {
```
Logo abaixo do bloco de preço/cidade (antes da descrição), inserir:
```tsx
{interactions && (
  <div className="mt-4 flex flex-wrap gap-2">
    <LikeButton adId={ad.id} initialActive={interactions.liked} initialCount={interactions.likeCount}
      canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
    <FavoriteButton adId={ad.id} initialActive={interactions.favorited}
      canInteract={interactions.canInteract} loggedIn={interactions.loggedIn} />
  </div>
)}
```

- [ ] **Step 2: Página de detalhe carrega contagem + estado**

Modify `src/app/anuncio/[id]/page.tsx`:

(a) Trocar o import do supabase para incluir `createServerClient`:
```tsx
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
```

(b) Depois de montar `data` (o objeto `AdCardData`) e antes do `return`, adicionar:
```tsx
// interações: contagem de curtidas + estado do usuário logado
const ssr = await createServerClient();
const { data: { user } } = await ssr.auth.getUser();
const { count: likeCount } = await admin
  .from("likes").select("*", { count: "exact", head: true }).eq("ad_id", data.id);

let liked = false;
let favorited = false;
let role: string | null = null;
if (user) {
  const [{ data: l }, { data: f }, { data: p }] = await Promise.all([
    admin.from("likes").select("id").eq("ad_id", data.id).eq("user_id", user.id).maybeSingle(),
    admin.from("favorites").select("id").eq("ad_id", data.id).eq("user_id", user.id).maybeSingle(),
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  liked = !!l;
  favorited = !!f;
  role = (p?.role as string | undefined) ?? null;
}

const interactions = {
  likeCount: likeCount ?? 0,
  liked,
  favorited,
  canInteract: role === "comum",
  loggedIn: !!user,
};
```

(c) Passar `interactions` ao componente no `return`:
```tsx
return (
  <>
    <SiteHeader />
    <AdDetail ad={data} now={new Date()} backHref="/" interactions={interactions} />
  </>
);
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/app/anuncio/"[id]"/page.tsx src/components/AdDetail.tsx
git commit -m "feat: detalhe com curtir/favoritar e contagem"
```

---

### Task 7: Contador de curtidas no card + na home

**Files:**
- Modify: `src/components/AdCard.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: agregado de likes por `ad_id`.
- Produces: `AdCardData` ganha `like_count?: number`; card exibe um selinho de curtidas.

- [ ] **Step 1: AdCard exibe contador**

Modify `src/components/AdCard.tsx` — no tipo `AdCardData` adicionar `like_count?: number;`. No canto da mídia (junto ao horário), adicionar um selo quando houver curtidas. Abaixo do `<span>` do tempo, dentro do `<div className="relative">` da mídia:
```tsx
{typeof ad.like_count === "number" && ad.like_count > 0 && (
  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-pill bg-ink/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" />
    </svg>
    {ad.like_count}
  </span>
)}
```

- [ ] **Step 2: Home carrega like_count por anúncio**

Modify `src/app/page.tsx` — depois de montar `ads` (array final), buscar contagens e mesclar:
```tsx
if (ads.length > 0) {
  const ids = ads.map((a) => a.id);
  const { data: likeRows } = await admin.from("likes").select("ad_id").in("ad_id", ids);
  const counts = new Map<string, number>();
  (likeRows ?? []).forEach((r: { ad_id: string }) => counts.set(r.ad_id, (counts.get(r.ad_id) ?? 0) + 1));
  ads.forEach((a) => { a.like_count = counts.get(a.id) ?? 0; });
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdCard.tsx src/app/page.tsx
git commit -m "feat: contador de curtidas no card e na home"
```

---

### Task 8: /conta — favoritos do usuário comum

**Files:**
- Create: `src/app/conta/page.tsx`

**Interfaces:**
- Consumes: `createServerClient`, `createAdminClient`, `AdCard`.
- Produces: rota `/conta` que lista os anúncios favoritados pelo usuário logado.

- [ ] **Step 1: Página /conta**

Create `src/app/conta/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import AdCard, { type AdCardData } from "@/components/AdCard";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: favRows } = await admin
    .from("favorites").select("ad_id").eq("user_id", user.id).order("created_at", { ascending: false });
  const favIds = (favRows ?? []).map((r: { ad_id: string }) => r.ad_id);

  let ads: AdCardData[] = [];
  if (favIds.length > 0) {
    const { data } = await admin
      .from("ads")
      .select("id, title, description, price_cents, is_available, created_at, cities ( name, uf ), profiles ( whatsapp )")
      .in("id", favIds)
      .eq("status", "active");
    ads = (data ?? []).map((r: any) => ({
      id: r.id, title: r.title, description: r.description, price_cents: r.price_cents,
      is_available: r.is_available, created_at: r.created_at,
      city: r.cities ? { name: (Array.isArray(r.cities) ? r.cities[0] : r.cities).name, uf: (Array.isArray(r.cities) ? r.cities[0] : r.cities).uf } : null,
      whatsapp: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.whatsapp ?? "",
    }));
  }

  const now = new Date();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        <h1 className="py-7 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Favoritos</h1>
        {ads.length === 0 ? (
          <p className="text-muted">Você ainda não favoritou nenhum anúncio.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad, i) => <AdCard key={ad.id} ad={ad} now={now} index={i} />)}
          </div>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 2: Build + suíte**

Run: `npm run build`
Expected: build ok.
Run: `npm test`
Expected: PASS (inclui roles).

- [ ] **Step 3: Commit**

```bash
git add src/app/conta/page.tsx
git commit -m "feat: pagina /conta com favoritos"
```

---

### Task 9: Env + preview (mock com curtidas/botões)

**Files:**
- Modify: `.env.example`, `src/app/preview/mock.ts`, `src/app/preview/anuncio/[id]/page.tsx`, `src/app/preview/page.tsx`

**Interfaces:**
- Produces: `.env.example` com `ADMIN_EMAIL`; preview mostra contador e botões (visual).

- [ ] **Step 1: .env.example**

Modify `.env.example` — adicionar linha:
```
ADMIN_EMAIL=
```

- [ ] **Step 2: Mock com like_count**

Modify `src/app/preview/mock.ts` — em cada objeto de `getPreviewAds()` adicionar `like_count` (ex.: 12, 5, 30, 0, 8, 3, 21, 1, 14 respectivamente). O tipo já aceita (opcional).

- [ ] **Step 3: Preview detalhe mostra botões (visual)**

Modify `src/app/preview/anuncio/[id]/page.tsx` — passar `interactions` fake ao `AdDetail`:
```tsx
<AdDetail ad={ad} now={new Date()} backHref="/preview"
  interactions={{ likeCount: ad.like_count ?? 0, liked: false, favorited: false, canInteract: true, loggedIn: true }} />
```

- [ ] **Step 4: Build + verificação**

Run: `npm run build`
Expected: build ok.
Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .env.example src/app/preview
git commit -m "chore(preview): mock com curtidas e botoes de interacao"
```

---

## Self-Review (cobertura da spec 2A)

- Papéis no cadastro (comum/anunciante), sem Google: Task 3 ✔
- `profiles.role` + RLS por papel: Task 1 ✔
- Curtir (toggle, contador, público): Tasks 1,4,5,6,7 ✔
- Favoritar (toggle, privado): Tasks 1,4,5,6 ✔
- `/conta` favoritos: Task 8 ✔
- Admin via ADMIN_EMAIL: só env aqui (Task 9); painel é Plano 2B.
- Avaliar/denunciar: **Plano 2B** (fora daqui).

## Placeholders
Nenhum. (Task 6 Step 2 usa `createServerClient` de forma explícita, sem placeholders.)
