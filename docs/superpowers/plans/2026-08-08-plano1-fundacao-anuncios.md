# Plano 1 — Fundação, Auth e Anúncios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Next.js navegável onde o anunciante loga, cria 1 anúncio (título, descrição, preço, cidade), marca disponível, sobe pro topo (com cooldown por plano), e o visitante vê os anúncios em cards ordenados na home com botão de WhatsApp.

**Architecture:** Next.js (App Router, TS) + Tailwind no front/back. Supabase (Postgres + Auth) para dados e login. Lógica pura (bump/cooldown, formatação, distância) isolada em `lib/` com testes Vitest. Acesso ao banco via Supabase client (browser: anon; server: service role). RLS garante leitura pública de anúncios e escrita só do dono.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (@supabase/supabase-js, @supabase/ssr), Vitest, Vercel (deploy depois).

## Global Constraints

- Linguagem da UI: **pt-BR**.
- Preços armazenados em **centavos (int)**; exibidos como `R$ 39,90` (vírgula decimal).
- **1 anúncio por conta** (`ads.profile_id` UNIQUE).
- Planos e limites (valores exatos):
  - Básico: R$ 39,90 · bump 60 min · story ❌ · 6 fotos · 1 vídeo
  - Pro: R$ 69,90 · bump 15 min · story ✅ · 12 fotos · 3 vídeos
  - Premium: R$ 99,90 · bump 0 min (sem cooldown) · story ✅ · 12 fotos · 3 vídeos
- Raio de cidades próximas: **100 km** (usado no Plano 3; haversine já entra aqui).
- Datas/horas em **timestamptz**; comparações no servidor com `now()`.
- Sem segredos no cliente: service role só em código de servidor.
- Nomes de tabelas/campos exatamente como na spec (`docs/superpowers/specs/2026-08-08-marketplace-servicos-design.md`).

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, tailwind/postcss config
vitest.config.ts
.env.example
src/
  app/
    layout.tsx                 # layout raiz (pt-BR, Tailwind)
    page.tsx                   # HOME: lista de anúncios em cards
    globals.css
    login/page.tsx             # login/cadastro
    auth/callback/route.ts     # troca de código OAuth/email por sessão
    perfil/page.tsx            # painel do anunciante (server component)
    perfil/ad-form.tsx         # form criar/editar anúncio (client)
    perfil/ad-actions.tsx      # botões: disponível, subir (client)
    api/ads/route.ts           # POST criar/editar anúncio (server, valida)
    api/ads/bump/route.ts      # POST subir (valida cooldown)
    api/ads/availability/route.ts # POST toggle disponível
  components/
    AdCard.tsx                 # card de anúncio na home
    WhatsAppButton.tsx         # botão wa.me
    CitySelect.tsx             # <select> de cidades (seed)
  lib/
    supabase/browser.ts        # client anon (browser)
    supabase/server.ts         # client server (cookies) + admin (service role)
    bump.ts                    # canBump / nextBumpAt (puro)
    geo.ts                     # haversineKm / nearestCity (puro)
    format.ts                  # formatBRL / timeAgo (puro)
    plans.ts                   # tipos + constantes dos planos
  lib/__tests__/
    bump.test.ts
    geo.test.ts
    format.test.ts
supabase/
  migrations/0001_init.sql     # tabelas + RLS + índices
  seed/plans.sql               # seed dos 3 planos
  seed/cities.sql              # seed inicial de cidades (subset; full no Plano 3)
```

> UI (componentes React/rotas) usa passos concretos de implementação. **Lógica pura** (`lib/bump.ts`, `lib/geo.ts`, `lib/format.ts`) segue TDD estrito (teste falha → implementa → passa). E2E de UI é manual ao fim.

---

### Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: projeto Next.js na raiz (merge com `docs/` existente), `vitest.config.ts`, `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: projeto que builda (`npm run build`) e roda testes (`npm test`).

- [ ] **Step 1: Criar app Next.js na pasta atual**

Run (na raiz do projeto, que já tem `docs/`):
```bash
npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --use-npm --no-import-alias --yes
```
Se reclamar de diretório não vazio, confirmar merge (mantém `docs/`).

- [ ] **Step 2: Instalar deps de teste e Supabase**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Configurar Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

Add scripts to `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Smoke test**

Create `src/lib/__tests__/smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("ambiente de teste funciona", () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 5: Rodar teste e build**

Run: `npm test`
Expected: PASS (1 teste)
Run: `npm run build`
Expected: build conclui sem erro.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

### Task 2: Constantes de planos + formatação (TDD)

**Files:**
- Create: `src/lib/plans.ts`, `src/lib/format.ts`, `src/lib/__tests__/format.test.ts`

**Interfaces:**
- Produces:
  - `PLANS: Plan[]` e `type Plan = { slug: "basico"|"pro"|"premium"; name: string; priceCents: number; bumpCooldownMinutes: number; allowsStory: boolean; maxPhotos: number; maxVideos: number }`
  - `formatBRL(cents: number): string`
  - `timeAgo(date: Date, now: Date): string`

- [ ] **Step 1: Teste falhando de formatBRL/timeAgo**

Create `src/lib/__tests__/format.test.ts`:
```ts
import { expect, test } from "vitest";
import { formatBRL, timeAgo } from "../format";

test("formatBRL formata centavos em reais", () => {
  expect(formatBRL(3990)).toBe("R$ 39,90");
  expect(formatBRL(99900)).toBe("R$ 999,00");
  expect(formatBRL(0)).toBe("R$ 0,00");
});

test("timeAgo em pt-BR", () => {
  const now = new Date("2026-08-08T12:00:00Z");
  expect(timeAgo(new Date("2026-08-08T11:59:30Z"), now)).toBe("agora");
  expect(timeAgo(new Date("2026-08-08T11:30:00Z"), now)).toBe("há 30 min");
  expect(timeAgo(new Date("2026-08-08T10:00:00Z"), now)).toBe("há 2 h");
  expect(timeAgo(new Date("2026-08-06T12:00:00Z"), now)).toBe("há 2 d");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- format`
Expected: FAIL (módulo `../format` não existe).

- [ ] **Step 3: Implementar format.ts**

Create `src/lib/format.ts`:
```ts
export function formatBRL(cents: number): string {
  const reais = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${reais}`;
}

export function timeAgo(date: Date, now: Date): string {
  const secs = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (secs < 60) return "agora";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}
```

- [ ] **Step 4: Implementar plans.ts**

Create `src/lib/plans.ts`:
```ts
export type PlanSlug = "basico" | "pro" | "premium";

export type Plan = {
  slug: PlanSlug;
  name: string;
  priceCents: number;
  bumpCooldownMinutes: number;
  allowsStory: boolean;
  maxPhotos: number;
  maxVideos: number;
};

export const PLANS: Plan[] = [
  { slug: "basico",  name: "Básico",  priceCents: 3990, bumpCooldownMinutes: 60, allowsStory: false, maxPhotos: 6,  maxVideos: 1 },
  { slug: "pro",     name: "Pro",     priceCents: 6990, bumpCooldownMinutes: 15, allowsStory: true,  maxPhotos: 12, maxVideos: 3 },
  { slug: "premium", name: "Premium", priceCents: 9990, bumpCooldownMinutes: 0,  allowsStory: true,  maxPhotos: 12, maxVideos: 3 },
];

export function planBySlug(slug: PlanSlug): Plan {
  const p = PLANS.find((x) => x.slug === slug);
  if (!p) throw new Error(`Plano inválido: ${slug}`);
  return p;
}
```

- [ ] **Step 5: Rodar teste**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/format.ts src/lib/plans.ts src/lib/__tests__/format.test.ts
git commit -m "feat: constantes de planos e formatação (BRL, timeAgo)"
```

---

### Task 3: Lógica de bump/cooldown (TDD)

**Files:**
- Create: `src/lib/bump.ts`, `src/lib/__tests__/bump.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `canBump(lastBumpedAt: Date | null, cooldownMinutes: number, now: Date): boolean`
  - `nextBumpAt(lastBumpedAt: Date | null, cooldownMinutes: number): Date | null` (null = pode subir já)

- [ ] **Step 1: Teste falhando**

Create `src/lib/__tests__/bump.test.ts`:
```ts
import { expect, test } from "vitest";
import { canBump, nextBumpAt } from "../bump";

const now = new Date("2026-08-08T12:00:00Z");

test("nunca subiu → pode subir", () => {
  expect(canBump(null, 60, now)).toBe(true);
  expect(nextBumpAt(null, 60)).toBeNull();
});

test("cooldown 0 (premium) → sempre pode", () => {
  expect(canBump(new Date("2026-08-08T11:59:59Z"), 0, now)).toBe(true);
});

test("dentro do cooldown → não pode", () => {
  const last = new Date("2026-08-08T11:30:00Z"); // 30 min atrás
  expect(canBump(last, 60, now)).toBe(false);
});

test("fora do cooldown → pode", () => {
  const last = new Date("2026-08-08T10:30:00Z"); // 90 min atrás
  expect(canBump(last, 60, now)).toBe(true);
});

test("nextBumpAt = last + cooldown", () => {
  const last = new Date("2026-08-08T11:30:00Z");
  expect(nextBumpAt(last, 60)?.toISOString()).toBe("2026-08-08T12:30:00.000Z");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- bump`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar bump.ts**

Create `src/lib/bump.ts`:
```ts
export function nextBumpAt(lastBumpedAt: Date | null, cooldownMinutes: number): Date | null {
  if (lastBumpedAt === null || cooldownMinutes <= 0) return null;
  return new Date(lastBumpedAt.getTime() + cooldownMinutes * 60_000);
}

export function canBump(lastBumpedAt: Date | null, cooldownMinutes: number, now: Date): boolean {
  const next = nextBumpAt(lastBumpedAt, cooldownMinutes);
  if (next === null) return true;
  return now.getTime() >= next.getTime();
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- bump`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bump.ts src/lib/__tests__/bump.test.ts
git commit -m "feat: lógica de bump com cooldown por plano"
```

---

### Task 4: Distância geográfica (TDD)

**Files:**
- Create: `src/lib/geo.ts`, `src/lib/__tests__/geo.test.ts`

**Interfaces:**
- Produces:
  - `type Coord = { lat: number; lng: number }`
  - `haversineKm(a: Coord, b: Coord): number`
  - `nearestCity<T extends Coord>(point: Coord, cities: T[]): T | null`

- [ ] **Step 1: Teste falhando**

Create `src/lib/__tests__/geo.test.ts`:
```ts
import { expect, test } from "vitest";
import { haversineKm, nearestCity } from "../geo";

test("haversine SP↔RJ ~360km", () => {
  const sp = { lat: -23.5505, lng: -46.6333 };
  const rj = { lat: -22.9068, lng: -43.1729 };
  const d = haversineKm(sp, rj);
  expect(d).toBeGreaterThan(340);
  expect(d).toBeLessThan(380);
});

test("mesmo ponto = 0", () => {
  expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBeCloseTo(0);
});

test("nearestCity escolhe a mais próxima", () => {
  const cities = [
    { id: 1, lat: -23.55, lng: -46.63 }, // SP
    { id: 2, lat: -22.90, lng: -43.17 }, // RJ
  ];
  const perto_de_sp = { lat: -23.6, lng: -46.6 };
  expect(nearestCity(perto_de_sp, cities)?.id).toBe(1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- geo`
Expected: FAIL.

- [ ] **Step 3: Implementar geo.ts**

Create `src/lib/geo.ts`:
```ts
export type Coord = { lat: number; lng: number };

const R = 6371; // raio da Terra em km
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCity<T extends Coord>(point: Coord, cities: T[]): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const c of cities) {
    const d = haversineKm(point, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- geo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/__tests__/geo.test.ts
git commit -m "feat: haversine e nearestCity"
```

---

### Task 5: Migrations do banco + RLS + seeds

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/seed/plans.sql`, `supabase/seed/cities.sql`

**Interfaces:**
- Produces: schema com tabelas `profiles, plans, subscriptions, ads, ad_media, stories, cities` + RLS. Aplicado no Supabase na fase de config (Plano 5) ou assim que o projeto Supabase existir.

- [ ] **Step 1: Escrever migration inicial**

Create `supabase/migrations/0001_init.sql`:
```sql
-- Extensões
create extension if not exists "pgcrypto";

-- CITIES
create table public.cities (
  id serial primary key,
  name text not null,
  uf text not null,
  lat double precision not null,
  lng double precision not null
);
create index cities_uf_idx on public.cities (uf);

-- PLANS
create table public.plans (
  id serial primary key,
  slug text unique not null,
  name text not null,
  price_cents int not null,
  bump_cooldown_minutes int not null,
  allows_story boolean not null default false,
  max_photos int not null,
  max_videos int not null,
  stripe_price_id text
);

-- PROFILES (1:1 auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  whatsapp text not null default '',
  city_id int references public.cities(id),
  created_at timestamptz not null default now()
);

-- SUBSCRIPTIONS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id int not null references public.plans(id),
  status text not null default 'expired', -- active/past_due/canceled/expired
  method text,                            -- card/pix
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);
create index subscriptions_profile_idx on public.subscriptions (profile_id);

-- ADS (1 por conta)
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  price_cents int not null default 0,
  city_id int references public.cities(id),
  is_available boolean not null default false,
  bumped_at timestamptz,
  status text not null default 'active', -- active/hidden
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ads_sort_idx on public.ads (bumped_at desc nulls last, created_at desc);
create index ads_city_idx on public.ads (city_id);

-- AD_MEDIA
create table public.ad_media (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  type text not null, -- photo/video
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index ad_media_ad_idx on public.ad_media (ad_id, position);

-- STORIES
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index stories_ad_idx on public.stories (ad_id, expires_at desc);

-- RLS
alter table public.profiles     enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ads          enable row level security;
alter table public.ad_media     enable row level security;
alter table public.stories      enable row level security;
alter table public.plans        enable row level security;
alter table public.cities       enable row level security;

-- Helpers SECURITY DEFINER: bypassam RLS para checagem de visibilidade pública.
-- (Necessário: consultar subscriptions/ads dentro de uma policy re-aplica a RLS
--  dessas tabelas ao papel chamador, zerando o EXISTS para visitante anônimo.)
create or replace function public.has_active_subscription(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.profile_id = p_profile_id
      and s.status = 'active'
      and s.current_period_end > now()
  );
$$;

create or replace function public.is_ad_visible(p_ad_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ads a
    where a.id = p_ad_id and a.status = 'active'
      and public.has_active_subscription(a.profile_id)
  );
$$;

-- Leitura pública de plans e cities
create policy "plans_public_read" on public.plans for select using (true);
create policy "cities_public_read" on public.cities for select using (true);

-- profiles: dono lê/edita o seu; leitura pública restrita a colunas via view (abaixo)
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ads: leitura pública apenas de anúncios visíveis; dono gerencia o seu
create policy "ads_public_read_visible" on public.ads
  for select using (
    status = 'active' and public.has_active_subscription(profile_id)
  );
create policy "ads_owner_read" on public.ads
  for select using (auth.uid() = profile_id);
create policy "ads_owner_write" on public.ads
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ad_media/stories: leitura pública se o anúncio pai é visível; dono gerencia
create policy "ad_media_public_read" on public.ad_media
  for select using ( public.is_ad_visible(ad_id) );
create policy "ad_media_owner_write" on public.ad_media
  for all using (exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid()))
  with check (exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid()));

create policy "stories_public_read" on public.stories
  for select using ( expires_at > now() and public.is_ad_visible(ad_id) );
create policy "stories_owner_write" on public.stories
  for all using (exists (select 1 from public.ads a where a.id = stories.ad_id and a.profile_id = auth.uid()))
  with check (exists (select 1 from public.ads a where a.id = stories.ad_id and a.profile_id = auth.uid()));

-- subscriptions: dono lê; escrita só service role (sem policy de insert/update p/ anon/auth)
create policy "subscriptions_owner_read" on public.subscriptions
  for select using (auth.uid() = profile_id);

-- Trigger: cria profile ao criar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

> Nota sobre leitura pública de `profiles` (nome/whatsapp/cidade do dono do anúncio):
> o front lê esses campos via join no server usando **service role** (rota de servidor),
> então não expomos `profiles` publicamente via RLS. Alternativa (Plano 3): view pública
> `public_ads` com apenas colunas necessárias.

- [ ] **Step 2: Seed dos planos**

Create `supabase/seed/plans.sql`:
```sql
insert into public.plans (slug, name, price_cents, bump_cooldown_minutes, allows_story, max_photos, max_videos)
values
  ('basico','Básico',3990,60,false,6,1),
  ('pro','Pro',6990,15,true,12,3),
  ('premium','Premium',9990,0,true,12,3)
on conflict (slug) do update set
  name=excluded.name, price_cents=excluded.price_cents,
  bump_cooldown_minutes=excluded.bump_cooldown_minutes,
  allows_story=excluded.allows_story, max_photos=excluded.max_photos, max_videos=excluded.max_videos;
```

- [ ] **Step 3: Seed inicial de cidades (subset; dataset completo no Plano 3)**

Create `supabase/seed/cities.sql`:
```sql
insert into public.cities (name, uf, lat, lng) values
  ('São Paulo','SP',-23.5505,-46.6333),
  ('Guarulhos','SP',-23.4543,-46.5337),
  ('Osasco','SP',-23.5329,-46.7916),
  ('Campinas','SP',-22.9099,-47.0626),
  ('Santo André','SP',-23.6639,-46.5383),
  ('Rio de Janeiro','RJ',-22.9068,-43.1729),
  ('Niterói','RJ',-22.8832,-43.1034),
  ('Belo Horizonte','MG',-19.9167,-43.9345),
  ('Curitiba','PR',-25.4284,-49.2733),
  ('Porto Alegre','RS',-30.0346,-51.2177)
on conflict do nothing;
```

- [ ] **Step 4: Commit** (aplicação no Supabase acontece no Plano 5 / quando projeto existir)

```bash
git add supabase/
git commit -m "feat: migrations, RLS e seeds (plans, cidades iniciais)"
```

---

### Task 6: Supabase clients (browser + server)

**Files:**
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `.env.example`
- Modify: `.env.local` (não commitar) — preenchido na config.

**Interfaces:**
- Produces:
  - `createBrowserClient()` (anon, client components)
  - `createServerClient()` (SSR com cookies, respeita sessão/RLS)
  - `createAdminClient()` (service role, só server — bypassa RLS)

- [ ] **Step 1: .env.example**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 2: Client browser**

Create `src/lib/supabase/browser.ts`:
```ts
"use client";
import { createBrowserClient as create } from "@supabase/ssr";

export function createBrowserClient() {
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Clients server**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient as create } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de Server Component: ignorar (middleware cuida do refresh)
          }
        },
      },
    }
  );
}

// Service role — SOMENTE em código de servidor. Bypassa RLS.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build ok (sem uso ainda, mas compila).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase .env.example
git commit -m "feat: clients Supabase (browser, server, admin)"
```

---

### Task 7: Auth — login/cadastro + callback + middleware de sessão

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts`
- Create: `src/app/logout/route.ts`

**Interfaces:**
- Consumes: `createBrowserClient`, `createServerClient`.
- Produces: sessão Supabase em cookies; usuário logado acessa `/perfil`.

- [ ] **Step 1: Middleware de refresh de sessão**

Create `src/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Página de login/cadastro (email/senha + Google)**

Create `src/app/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setMsg(error ? error.message : "");
    if (!error) window.location.href = "/perfil";
  }
  async function cadastrar() {
    const { error } = await supabase.auth.signUp({
      email, password: senha,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMsg(error ? error.message : "Verifique seu e-mail para confirmar.");
  }
  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <input className="w-full border rounded p-2" placeholder="E-mail"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" type="password" placeholder="Senha"
        value={senha} onChange={(e) => setSenha(e.target.value)} />
      <div className="flex gap-2">
        <button className="bg-black text-white rounded p-2 flex-1" onClick={entrar}>Entrar</button>
        <button className="border rounded p-2 flex-1" onClick={cadastrar}>Cadastrar</button>
      </div>
      <button className="w-full border rounded p-2" onClick={google}>Entrar com Google</button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Callback OAuth/email**

Create `src/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/perfil`);
}
```

- [ ] **Step 4: Logout**

Create `src/app/logout/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${new URL(request.url).origin}/`);
}
```

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 6: Commit**

```bash
git add src/app/login src/app/auth src/app/logout src/middleware.ts
git commit -m "feat: auth (login/cadastro, Google, callback, middleware de sessão)"
```

> Verificação funcional real (login de verdade) ocorre após config do Supabase (Plano 5).

---

### Task 8: Painel do anunciante — form de anúncio + rota de salvar

**Files:**
- Create: `src/app/perfil/page.tsx`, `src/app/perfil/ad-form.tsx`, `src/app/api/ads/route.ts`, `src/components/CitySelect.tsx`

**Interfaces:**
- Consumes: `createServerClient`, `createAdminClient`, `PLANS`.
- Produces: `POST /api/ads` cria/atualiza o anúncio único do usuário logado.

- [ ] **Step 1: CitySelect (lista do banco)**

Create `src/components/CitySelect.tsx`:
```tsx
type City = { id: number; name: string; uf: string };

export default function CitySelect({
  cities, defaultValue, name = "city_id",
}: { cities: City[]; defaultValue?: number | null; name?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="w-full border rounded p-2">
      <option value="">Selecione a cidade</option>
      {cities.map((c) => (
        <option key={c.id} value={c.id}>{c.name} - {c.uf}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Rota POST /api/ads (validação no servidor)**

Create `src/app/api/ads/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const priceReais = Number(String(form.get("price") ?? "0").replace(",", "."));
  const cityId = form.get("city_id") ? Number(form.get("city_id")) : null;

  if (!title) return NextResponse.json({ error: "título obrigatório" }, { status: 400 });
  const price_cents = Math.max(0, Math.round(priceReais * 100));

  const admin = createAdminClient();
  // upsert do anúncio único (profile_id unique)
  const { error } = await admin
    .from("ads")
    .upsert(
      { profile_id: user.id, title, description, price_cents, city_id: cityId, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
```

- [ ] **Step 3: Form (client) de anúncio**

Create `src/app/perfil/ad-form.tsx`:
```tsx
import CitySelect from "@/components/CitySelect";

type City = { id: number; name: string; uf: string };
type Ad = { title: string; description: string; price_cents: number; city_id: number | null } | null;

export default function AdForm({ ad, cities }: { ad: Ad; cities: City[] }) {
  return (
    <form action="/api/ads" method="post" className="space-y-3">
      <input name="title" defaultValue={ad?.title ?? ""} placeholder="Nome do serviço"
        className="w-full border rounded p-2" required />
      <textarea name="description" defaultValue={ad?.description ?? ""} placeholder="Descrição"
        className="w-full border rounded p-2" rows={4} />
      <input name="price" defaultValue={ad ? (ad.price_cents / 100).toFixed(2).replace(".", ",") : ""}
        placeholder="Preço (ex: 150,00)" className="w-full border rounded p-2" />
      <CitySelect cities={cities} defaultValue={ad?.city_id ?? null} />
      <button className="bg-black text-white rounded p-2 w-full">Salvar anúncio</button>
    </form>
  );
}
```

- [ ] **Step 4: Página /perfil (server component)**

Create `src/app/perfil/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import AdForm from "./ad-form";
import AdActions from "./ad-actions";

export default async function PerfilPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: ad }, { data: cities }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meu anúncio</h1>
        <a href="/logout" className="text-sm underline">Sair</a>
      </div>
      <AdForm ad={ad ?? null} cities={cities ?? []} />
      {ad && <AdActions ad={ad} />}
    </div>
  );
}
```

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build ok (referência a `AdActions` criada na Task 9 — criar stub agora para compilar).

Create stub `src/app/perfil/ad-actions.tsx`:
```tsx
export default function AdActions({ ad }: { ad: { id: string } }) {
  return null;
}
```

Run: `npm run build`
Expected: build ok.

- [ ] **Step 6: Commit**

```bash
git add src/app/perfil src/app/api/ads src/components/CitySelect.tsx
git commit -m "feat: painel do anunciante + criar/editar anúncio"
```

---

### Task 9: Ações do anúncio — subir (bump) e disponível

**Files:**
- Create: `src/app/api/ads/bump/route.ts`, `src/app/api/ads/availability/route.ts`
- Modify: `src/app/perfil/ad-actions.tsx` (substituir stub)

**Interfaces:**
- Consumes: `canBump`, `nextBumpAt`, `planBySlug`, `createServerClient`, `createAdminClient`.
- Produces: `POST /api/ads/bump`, `POST /api/ads/availability`.

- [ ] **Step 1: Rota de bump com validação de cooldown**

Create `src/app/api/ads/bump/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { canBump } from "@/lib/bump";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ad } = await admin.from("ads").select("id, bumped_at, profile_id").eq("profile_id", user.id).maybeSingle();
  if (!ad) return NextResponse.json({ error: "sem anúncio" }, { status: 404 });

  // plano ativo → cooldown
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan_id, status, current_period_end, plans(bump_cooldown_minutes)")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const cooldown = (sub?.plans as { bump_cooldown_minutes: number } | null)?.bump_cooldown_minutes ?? 60;
  const last = ad.bumped_at ? new Date(ad.bumped_at) : null;
  if (!canBump(last, cooldown, new Date())) {
    return NextResponse.json({ error: "aguarde o cooldown para subir de novo" }, { status: 429 });
  }

  await admin.from("ads").update({ bumped_at: new Date().toISOString() }).eq("id", ad.id);
  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
```

- [ ] **Step 2: Rota de disponibilidade (toggle)**

Create `src/app/api/ads/availability/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const value = String(form.get("is_available")) === "true";

  const admin = createAdminClient();
  await admin.from("ads").update({ is_available: value }).eq("profile_id", user.id);
  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
```

- [ ] **Step 3: Componente de ações (substituir stub)**

Replace `src/app/perfil/ad-actions.tsx`:
```tsx
type Ad = { id: string; is_available: boolean; bumped_at: string | null };

export default function AdActions({ ad }: { ad: Ad }) {
  return (
    <div className="space-y-3 border-t pt-4">
      <form action="/api/ads/bump" method="post">
        <button className="w-full border rounded p-2">⬆ Subir pro topo</button>
      </form>
      <form action="/api/ads/availability" method="post" className="flex items-center gap-2">
        <input type="hidden" name="is_available" value={(!ad.is_available).toString()} />
        <button className={`w-full rounded p-2 ${ad.is_available ? "bg-green-600 text-white" : "border"}`}>
          {ad.is_available ? "✅ Disponível agora (clique p/ desligar)" : "Marcar como disponível agora"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ads/bump src/app/api/ads/availability src/app/perfil/ad-actions.tsx
git commit -m "feat: subir (bump com cooldown) e toggle disponível"
```

---

### Task 10: Home — cards de anúncio + WhatsApp

**Files:**
- Create: `src/components/AdCard.tsx`, `src/components/WhatsAppButton.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `createAdminClient`, `formatBRL`, `timeAgo`.
- Produces: home lista anúncios visíveis ordenados por `bumped_at desc, created_at desc`.

- [ ] **Step 1: WhatsAppButton**

Create `src/components/WhatsAppButton.tsx`:
```tsx
export default function WhatsAppButton({ phone, adTitle }: { phone: string; adTitle: string }) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(`Olá! Vi seu anúncio "${adTitle}" e tenho interesse.`);
  const href = `https://wa.me/${digits}?text=${text}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-block bg-green-600 text-white rounded px-3 py-1 text-sm">
      WhatsApp
    </a>
  );
}
```

- [ ] **Step 2: AdCard**

Create `src/components/AdCard.tsx`:
```tsx
import { formatBRL, timeAgo } from "@/lib/format";
import WhatsAppButton from "./WhatsAppButton";

export type AdCardData = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  is_available: boolean;
  created_at: string;
  city: { name: string; uf: string } | null;
  whatsapp: string;
};

export default function AdCard({ ad, now }: { ad: AdCardData; now: Date }) {
  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
        sem foto
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">{ad.title}</h3>
          {ad.is_available && (
            <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5">Disponível</span>
          )}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{ad.description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold">{formatBRL(ad.price_cents)}</span>
          <span className="text-xs text-gray-400">{timeAgo(new Date(ad.created_at), now)}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500">{ad.city ? `${ad.city.name}-${ad.city.uf}` : ""}</span>
          <WhatsAppButton phone={ad.whatsapp} adTitle={ad.title} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Home page**

Replace `src/app/page.tsx`:
```tsx
import { createAdminClient } from "@/lib/supabase/server";
import AdCard, { type AdCardData } from "@/components/AdCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // anúncios visíveis: status active + assinatura ativa
  const { data } = await admin
    .from("ads")
    .select(`
      id, title, description, price_cents, is_available, created_at,
      cities ( name, uf ),
      profiles ( whatsapp ),
      subscriptions:subscriptions!inner ( status, current_period_end )
    `)
    .eq("status", "active")
    .eq("subscriptions.status", "active")
    .gt("subscriptions.current_period_end", nowIso)
    .order("bumped_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const now = new Date();
  const ads: AdCardData[] = (data ?? []).map((r: any) => ({
    id: r.id, title: r.title, description: r.description, price_cents: r.price_cents,
    is_available: r.is_available, created_at: r.created_at,
    city: r.cities ? { name: r.cities.name, uf: r.cities.uf } : null,
    whatsapp: r.profiles?.whatsapp ?? "",
  }));

  return (
    <main className="mx-auto max-w-6xl p-4">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">Serviços</h1>
        <a href="/perfil" className="text-sm underline">Anunciar</a>
      </header>
      {ads.length === 0 ? (
        <p className="text-gray-500">Nenhum anúncio ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => <AdCard key={ad.id} ad={ad} now={now} />)}
        </div>
      )}
    </main>
  );
}
```

> Nota: o join `subscriptions!inner` assume relação FK. Se o PostgREST não inferir,
> ajustar para consulta em duas etapas (buscar ids de profiles com assinatura ativa e
> filtrar `ads`). Validar após config do Supabase (Plano 5).

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build ok.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdCard.tsx src/components/WhatsAppButton.tsx src/app/page.tsx
git commit -m "feat: home com cards de anúncio e botão WhatsApp"
```

---

### Task 11: Campos do perfil (nome, whatsapp) + verificação final

**Files:**
- Create: `src/app/api/profile/route.ts`
- Modify: `src/app/perfil/page.tsx` (adicionar mini-form de perfil)

**Interfaces:**
- Produces: `POST /api/profile` salva `name`, `whatsapp` do usuário. WhatsApp usado no card.

- [ ] **Step 1: Rota de perfil**

Create `src/app/api/profile/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const whatsapp = String(form.get("whatsapp") ?? "").trim();

  const admin = createAdminClient();
  await admin.from("profiles").update({ name, whatsapp }).eq("id", user.id);
  return NextResponse.redirect(new URL("/perfil", request.url), { status: 303 });
}
```

- [ ] **Step 2: Mini-form de perfil na página**

Modify `src/app/perfil/page.tsx` — buscar profile e renderizar form antes do AdForm:

Adicionar à query:
```tsx
const [{ data: ad }, { data: cities }, { data: profile }] = await Promise.all([
  admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
  admin.from("cities").select("id,name,uf").order("name"),
  admin.from("profiles").select("name,whatsapp").eq("id", user.id).maybeSingle(),
]);
```

Adicionar antes de `<AdForm ...>`:
```tsx
<form action="/api/profile" method="post" className="space-y-2 border-b pb-4">
  <input name="name" defaultValue={profile?.name ?? ""} placeholder="Seu nome"
    className="w-full border rounded p-2" />
  <input name="whatsapp" defaultValue={profile?.whatsapp ?? ""} placeholder="WhatsApp (ex: 5511999999999)"
    className="w-full border rounded p-2" />
  <button className="border rounded p-2 w-full">Salvar contato</button>
</form>
```

- [ ] **Step 3: Rodar toda a suíte + build**

Run: `npm test`
Expected: PASS (format, bump, geo, smoke).
Run: `npm run build`
Expected: build ok.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/profile src/app/perfil/page.tsx
git commit -m "feat: dados de contato do anunciante (nome, whatsapp)"
```

---

## Self-Review (cobertura da spec)

- Auth (só anunciante, email+Google): Tasks 7 ✔
- 1 anúncio/conta (unique): Task 5 (schema) + Task 8 (upsert) ✔
- Criar/editar anúncio (nome, desc, preço, cidade): Task 8 ✔
- Home cards (nome, desc, preço, cidade, tempo, disponível): Task 10 ✔
- Ordenação bumped_at/created_at: Task 5 (índice) + Task 10 ✔
- Bump com cooldown por plano: Task 3 + Task 9 ✔
- Disponível agora: Task 9 ✔
- WhatsApp: Task 10 ✔
- Planos + limites (constantes/seed): Task 2 + Task 5 ✔
- RLS: Task 5 ✔
- Haversine (base pro Plano 3): Task 4 ✔
- **Fora deste plano (planos seguintes):** mídia/fotos/vídeos (Plano 2), story 24h (Plano 2), geo GPS/seletor/≤100km na home (Plano 3), pagamento Stripe e gating real por assinatura (Plano 4), deploy/config (Plano 5).

**Nota de gating:** neste plano a home só mostra anúncios com assinatura ativa. Como o fluxo de pagamento entra no Plano 4, para testar visualmente antes disso insere-se uma assinatura ativa manual (SQL) no Plano 5/teste. Documentado — não é omissão.

## Placeholders
Nenhum "TODO/TBD". Stub de `ad-actions.tsx` (Task 8) é intencional e substituído na Task 9.
