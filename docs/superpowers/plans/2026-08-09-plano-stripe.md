# Pagamento Stripe (Elements embutido) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anunciante assina um plano (cartão recorrente ou Pix avulso 30d) via Stripe Payment Element embutido; a assinatura ativa libera a visibilidade do anúncio.

**Architecture:** Cliente inicia intents no server (Subscription `default_incomplete` p/ cartão; PaymentIntent Pix avulso), confirma no `<PaymentElement/>` embutido. O **webhook** (service-role) é a ÚNICA escrita de `subscriptions`, idempotente por `profile_id`. Sem redirect ao Checkout hospedado.

**Tech Stack:** Next.js 16 (App Router), `stripe` (server), `@stripe/stripe-js` + `@stripe/react-stripe-js` (client), Supabase (service-role no webhook), Vitest.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-09-pagamento-stripe-design.md`.
- Secret key e webhook secret **só no server**; `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` no client.
- Valor/plano SEMPRE resolvidos no server pelo `slug` (nunca confiar em valor do client).
- Webhook verifica assinatura (`stripe.webhooks.constructEvent`) e é idempotente (`upsert onConflict profile_id`).
- Rotas que usam Stripe: `export const runtime = "nodejs"` (Stripe não roda em edge).
- Planos no banco: `basico`(id 1, 3990), `pro`(id 2, 6990), `premium`(id 3, 9990). `stripe_price_id` começa null.
- Gate já existente (home/detalhe): `status='active' AND current_period_end > now()`. NÃO alterar.
- Test mode primeiro. Chaves lidas do dashboard logado e gravadas no `.env.local` (não passam pelo chat).
- Testes: `src/lib/__tests__/<nome>.test.ts`, `import { expect, test } from "vitest"`. Rodar: `npm test`.

---

### Task 1: Dependências + `lib/subscription.ts` (regras puras, TDD) + clients Stripe

**Files:**
- Modify: `package.json` (deps)
- Create: `src/lib/subscription.ts`
- Test: `src/lib/__tests__/subscription.test.ts`
- Create: `src/lib/stripe.ts` (server), `src/lib/stripe-browser.ts` (client)

**Interfaces:**
- Produces: `isActive(sub, now): boolean`; `pixPeriodEndISO(now, days=30): string`; `mapStripeStatus(s): "active"|"past_due"|"canceled"|"expired"`; `stripe` (server Stripe instance); `getStripe()` (browser promise).

- [ ] **Step 1: Instalar deps**

Run:
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```
Expected: adiciona `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js` em dependencies.

- [ ] **Step 2: Escrever o teste (falha)** — `src/lib/__tests__/subscription.test.ts`

```ts
import { expect, test } from "vitest";
import { isActive, pixPeriodEndISO, mapStripeStatus } from "../subscription";

const now = new Date("2026-08-09T12:00:00Z");

test("isActive: ativa só com status active e período no futuro", () => {
  expect(isActive({ status: "active", current_period_end: "2026-08-10T12:00:00Z" }, now)).toBe(true);
  expect(isActive({ status: "active", current_period_end: "2026-08-08T12:00:00Z" }, now)).toBe(false);
  expect(isActive({ status: "past_due", current_period_end: "2026-09-01T00:00:00Z" }, now)).toBe(false);
  expect(isActive({ status: "active", current_period_end: null }, now)).toBe(false);
  expect(isActive(null, now)).toBe(false);
});

test("pixPeriodEndISO: soma 30 dias por padrão", () => {
  expect(pixPeriodEndISO(now)).toBe("2026-09-08T12:00:00.000Z");
  expect(pixPeriodEndISO(now, 7)).toBe("2026-08-16T12:00:00.000Z");
});

test("mapStripeStatus: mapeia status do Stripe pros nossos", () => {
  expect(mapStripeStatus("active")).toBe("active");
  expect(mapStripeStatus("trialing")).toBe("active");
  expect(mapStripeStatus("past_due")).toBe("past_due");
  expect(mapStripeStatus("unpaid")).toBe("past_due");
  expect(mapStripeStatus("canceled")).toBe("canceled");
  expect(mapStripeStatus("incomplete_expired")).toBe("canceled");
  expect(mapStripeStatus("incomplete")).toBe("expired");
});
```

- [ ] **Step 3: Rodar teste (falha)**

Run: `npm test -- subscription`
Expected: FAIL (módulo `../subscription` não existe).

- [ ] **Step 4: Implementar** — `src/lib/subscription.ts`

```ts
export type SubStatus = "active" | "past_due" | "canceled" | "expired";
export type SubRow = { status: string; current_period_end: string | null };

const DAY_MS = 86_400_000;

export function isActive(sub: SubRow | null, now: Date): boolean {
  if (!sub || sub.status !== "active" || !sub.current_period_end) return false;
  return new Date(sub.current_period_end).getTime() > now.getTime();
}

export function pixPeriodEndISO(now: Date, days = 30): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

export function mapStripeStatus(s: string): SubStatus {
  switch (s) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "expired";
  }
}
```

- [ ] **Step 5: Rodar teste (passa)**

Run: `npm test -- subscription`
Expected: PASS.

- [ ] **Step 6: Clients Stripe** — `src/lib/stripe.ts`

```ts
import Stripe from "stripe";

// Server-only. Secret key nunca vai ao client.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```
Nota: se o `tsc` reclamar de `apiVersion` obrigatória, passe a versão que o pacote instalado espativa: `new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "<versão do types do pacote>" })`.

`src/lib/stripe-browser.ts`:

```ts
import { loadStripe, type Stripe } from "@stripe/stripe-js";

let promise: Promise<Stripe | null> | null = null;

export function getStripe() {
  if (!promise) promise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  return promise;
}
```

- [ ] **Step 7: tsc + commit**

Run: `npx tsc --noEmit`
Expected: sem erros (stripe.ts pode exigir a env em runtime; tipagem ok).
```bash
git add package.json package-lock.json src/lib/subscription.ts src/lib/__tests__/subscription.test.ts src/lib/stripe.ts src/lib/stripe-browser.ts
git commit -m "feat(stripe): deps + lib/subscription (regras puras) + clients"
```

---

### Task 2: Migration 0007 — unique(profile_id) em subscriptions

Habilita o `upsert onConflict: "profile_id"` (idempotência do webhook: uma assinatura corrente por profile).

**Files:**
- Create: `supabase/migrations/0007_subscriptions_unique.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Uma assinatura corrente por profile. Permite webhook idempotente (upsert onConflict profile_id).
-- Se houver duplicatas de teste, remova-as antes (mantém a mais recente) — ver nota de aplicação.
create unique index if not exists subscriptions_profile_uniq on public.subscriptions (profile_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0007_subscriptions_unique.sql
git commit -m "feat(db): 0007 unique(profile_id) em subscriptions (idempotencia webhook)"
```

**Aplicação (controller, no Supabase real):** antes de criar o índice, checar duplicatas:
`select profile_id, count(*) from subscriptions group by profile_id having count(*) > 1;`
Se houver, apagar as mais antigas por profile. Depois rodar a migration no SQL editor.

---

### Task 3: `scripts/stripe-setup.mjs` — cria Products/Prices e grava stripe_price_id

**Files:**
- Create: `scripts/stripe-setup.mjs`

**Interfaces:**
- Consumes: `.env.local` (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), tabela `plans`.
- Produces: `plans.stripe_price_id` preenchido; Prices recorrentes mensais em BRL no Stripe.

- [ ] **Step 1: Escrever o script**

```js
// Cria (idempotente por lookup_key) 1 Product + 1 Price recorrente mensal BRL por plano
// e grava plans.stripe_price_id. Uso: node scripts/stripe-setup.mjs
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: plans, error } = await supabase.from("plans").select("id, slug, name, price_cents").order("id");
if (error) throw error;

for (const plan of plans) {
  const lookup = `plan_${plan.slug}_monthly`;
  const found = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  let priceId = found.data[0]?.id;
  if (!priceId) {
    const product = await stripe.products.create({ name: `Plano ${plan.name}`, metadata: { slug: plan.slug } });
    const price = await stripe.prices.create({
      product: product.id, unit_amount: plan.price_cents, currency: "brl",
      recurring: { interval: "month" }, lookup_key: lookup,
    });
    priceId = price.id;
  }
  const up = await supabase.from("plans").update({ stripe_price_id: priceId }).eq("id", plan.id);
  if (up.error) throw up.error;
  console.log(`${plan.slug} -> ${priceId}`);
}
console.log("stripe-setup: done");
```

- [ ] **Step 2: Commit**

```bash
git add scripts/stripe-setup.mjs
git commit -m "feat(stripe): script cria prices recorrentes e grava stripe_price_id"
```

**Execução (controller):** rodar `node scripts/stripe-setup.mjs` DEPOIS de `STRIPE_SECRET_KEY` estar no `.env.local`. Verificar que imprime os 3 price ids e que `plans.stripe_price_id` ficou preenchido.

---

### Task 4: `POST /api/subscription/create` — inicia assinatura de cartão

**Files:**
- Create: `src/app/api/subscription/create/route.ts`

**Interfaces:**
- Consumes: `stripe` (Task 1), tabela `plans` (stripe_price_id), tabela `subscriptions`.
- Produces: resposta `{ clientSecret: string, subscriptionId: string }`. Faz `upsert` da linha `subscriptions` com `{ profile_id, plan_id, method:"card", stripe_customer_id }` (NÃO mexe em status/current_period_end — isso é do webhook).

- [ ] **Step 1: Implementar a rota**

```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { slug } = await request.json().catch(() => ({ slug: "" }));
  if (!slug) return NextResponse.json({ error: "plano inválido" }, { status: 400 });

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans").select("id, name, price_cents, stripe_price_id").eq("slug", slug).maybeSingle();
  if (!plan || !plan.stripe_price_id) {
    return NextResponse.json({ error: "plano indisponível" }, { status: 400 });
  }

  // reusa o customer da assinatura existente; senão cria
  const { data: existing } = await admin
    .from("subscriptions").select("stripe_customer_id").eq("profile_id", user.id).maybeSingle();
  let customerId = (existing?.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined, metadata: { profile_id: user.id },
    });
    customerId = customer.id;
  }

  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripe_price_id as string }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: { profile_id: user.id, plan_id: String(plan.id), method: "card" },
  });

  await admin.from("subscriptions").upsert(
    { profile_id: user.id, plan_id: plan.id, method: "card", stripe_customer_id: customerId },
    { onConflict: "profile_id" }
  );

  const invoice = sub.latest_invoice as unknown as { payment_intent?: { client_secret?: string } };
  const clientSecret = invoice?.payment_intent?.client_secret;
  if (!clientSecret) return NextResponse.json({ error: "falha ao iniciar pagamento" }, { status: 500 });
  return NextResponse.json({ clientSecret, subscriptionId: sub.id });
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → sem erros.
```bash
git add src/app/api/subscription/create/route.ts
git commit -m "feat(stripe): rota subscription/create (cartao, default_incomplete)"
```

---

### Task 5: `POST /api/pix/create` — inicia pagamento Pix avulso

**Files:**
- Create: `src/app/api/pix/create/route.ts`

**Interfaces:**
- Consumes: `stripe`, `plans`, `subscriptions`.
- Produces: `{ clientSecret: string }`. Upsert `subscriptions` `{ profile_id, plan_id, method:"pix" }` (status/period ficam pro webhook).

- [ ] **Step 1: Implementar a rota**

```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { slug } = await request.json().catch(() => ({ slug: "" }));
  const admin = createAdminClient();
  const { data: plan } = await admin.from("plans").select("id, price_cents").eq("slug", slug).maybeSingle();
  if (!plan) return NextResponse.json({ error: "plano inválido" }, { status: 400 });

  const pi = await stripe.paymentIntents.create({
    amount: plan.price_cents as number,
    currency: "brl",
    payment_method_types: ["pix"],
    metadata: { profile_id: user.id, plan_id: String(plan.id), method: "pix" },
  });

  await admin.from("subscriptions").upsert(
    { profile_id: user.id, plan_id: plan.id, method: "pix" },
    { onConflict: "profile_id" }
  );

  return NextResponse.json({ clientSecret: pi.client_secret });
}
```

- [ ] **Step 2: tsc + commit**

```bash
git add src/app/api/pix/create/route.ts
git commit -m "feat(stripe): rota pix/create (PaymentIntent avulso BRL)"
```

---

### Task 6: `POST /api/stripe/webhook` — fonte da verdade (idempotente)

**Files:**
- Create: `src/app/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `stripe`, `mapStripeStatus`/`pixPeriodEndISO` (Task 1), `STRIPE_WEBHOOK_SECRET`, service-role.
- Produces: escreve `subscriptions` via `upsert onConflict profile_id`.

- [ ] **Step 1: Implementar a rota**

```ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { mapStripeStatus, pixPeriodEndISO } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "sem assinatura" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `assinatura inválida: ${(e as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    switch (event.type) {
      case "invoice.paid": {
        const inv = event.data.object as unknown as { subscription: string | null };
        if (!inv.subscription) break;
        const sub = await stripe.subscriptions.retrieve(inv.subscription);
        const profileId = sub.metadata?.profile_id;
        if (!profileId) break;
        await admin.from("subscriptions").upsert({
          profile_id: profileId,
          plan_id: sub.metadata?.plan_id ? Number(sub.metadata.plan_id) : undefined,
          method: "card",
          status: mapStripeStatus(sub.status),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
        }, { onConflict: "profile_id" });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as {
          metadata?: { profile_id?: string }; status: string; current_period_end: number; id: string;
        };
        const profileId = sub.metadata?.profile_id;
        if (!profileId) break;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStripeStatus(sub.status);
        await admin.from("subscriptions").upsert({
          profile_id: profileId,
          method: "card",
          status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_subscription_id: sub.id,
        }, { onConflict: "profile_id" });
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as unknown as {
          metadata?: { method?: string; profile_id?: string; plan_id?: string };
        };
        if (pi.metadata?.method !== "pix" || !pi.metadata?.profile_id) break;
        await admin.from("subscriptions").upsert({
          profile_id: pi.metadata.profile_id,
          plan_id: pi.metadata.plan_id ? Number(pi.metadata.plan_id) : undefined,
          method: "pix",
          status: "active",
          current_period_end: pixPeriodEndISO(new Date()),
          stripe_subscription_id: null,
        }, { onConflict: "profile_id" });
        break;
      }
    }
  } catch (e) {
    console.error("webhook handler:", (e as Error).message);
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: tsc + commit**

Nota: se o tipo do `stripe` não expuser `current_period_end`/`subscription` diretamente, mantenha os casts `as unknown as {...}` acima.
```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat(stripe): webhook idempotente (invoice.paid, subscription.*, pix)"
```

---

### Task 7: `POST /api/billing-portal` + `GET /api/subscription/status`

**Files:**
- Create: `src/app/api/billing-portal/route.ts`
- Create: `src/app/api/subscription/status/route.ts`

**Interfaces:**
- billing-portal produces: `{ url: string }` (Stripe Billing Portal do customer do usuário).
- status produces: `{ sub: { status, method, current_period_end } | null, active: boolean }`.

- [ ] **Step 1: billing-portal**

```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions").select("stripe_customer_id").eq("profile_id", user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "sem assinatura de cartão" }, { status: 400 });

  const origin = new URL(request.url).origin;
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id as string,
    return_url: `${origin}/perfil`,
  });
  return NextResponse.json({ url: portal.url });
}
```

- [ ] **Step 2: status**

```ts
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions").select("status, method, current_period_end").eq("profile_id", user.id).maybeSingle();
  return NextResponse.json({ sub: sub ?? null, active: isActive(sub ?? null, new Date()) });
}
```

- [ ] **Step 3: tsc + commit**

```bash
git add src/app/api/billing-portal/route.ts src/app/api/subscription/status/route.ts
git commit -m "feat(stripe): billing-portal + subscription/status"
```

---

### Task 8: Página `/planos` + links de entrada

**Files:**
- Create: `src/app/planos/page.tsx`
- Modify: `src/app/perfil/page.tsx` (CTA "Ver planos" quando sem assinatura ativa)

**Interfaces:**
- Consumes: `PLANS` de `src/lib/plans.ts` (features), `formatBRL` de `src/lib/format.ts` (checar nome exato da função de preço — usar a existente; se for `priceBRL`/`formatPrice`, use-a).
- Produces: cards com `Link href={\`/assinar/${slug}\`}`.

- [ ] **Step 1: `/planos` (server component)**

```tsx
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { PLANS } from "@/lib/plans";
import { cardCls } from "@/components/ui";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PlanosPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Planos</h1>
        <p className="mt-1 text-sm text-muted">Assine para deixar seu anúncio visível. Cartão (mensal) ou Pix (30 dias).</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.slug} className={cardCls}>
              <h2 className="font-display text-lg font-bold text-ink">{p.name}</h2>
              <p className="mt-1 text-2xl font-extrabold text-accent">{brl(p.priceCents)}<span className="text-sm font-medium text-muted">/mês</span></p>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                <li>{p.maxPhotos} fotos · {p.maxVideos} vídeo(s)</li>
                <li>{p.allowsStory ? "Story 24h incluído" : "Sem story"}</li>
                <li>{p.bumpCooldownMinutes === 0 ? "Subir a qualquer hora" : `Subir a cada ${p.bumpCooldownMinutes} min`}</li>
              </ul>
              <Link href={`/assinar/${p.slug}`} className="mt-4 block rounded-input bg-accent py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">
                Assinar
              </Link>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: CTA no `/perfil`**

No `src/app/perfil/page.tsx`, adicionar (perto do topo do `<main>`, antes do form do anúncio) um bloco: se o usuário não tem assinatura ativa, mostrar um link "Ver planos". Buscar a assinatura já é feito no arquivo para `allowsStory`; reutilizar. Adicionar:

```tsx
// dentro do componente, após buscar `sub`/dados; calcular active com isActive
import { isActive } from "@/lib/subscription";
// ...
const active = isActive(
  (await admin.from("subscriptions").select("status, current_period_end").eq("profile_id", user.id).maybeSingle()).data ?? null,
  new Date()
);
// no JSX, antes da seção do anúncio:
{!active && (
  <Link href="/planos" className="block rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-center text-sm font-semibold text-accent">
    Seu anúncio fica visível com um plano ativo — ver planos
  </Link>
)}
```
(Se o arquivo já buscar a subscription, reutilize aquela query em vez de uma nova.)

- [ ] **Step 3: build + commit**

Run: `npx tsc --noEmit && npm run build` → ok.
```bash
git add src/app/planos/page.tsx src/app/perfil/page.tsx
git commit -m "feat(stripe): pagina /planos + CTA no perfil"
```

---

### Task 9: `/assinar/[slug]` + `SubscribeForm` (Payment Element embutido)

**Files:**
- Create: `src/app/assinar/[slug]/page.tsx` (server)
- Create: `src/components/SubscribeForm.tsx` (client)

**Interfaces:**
- Consumes: `getStripe()` (Task 1), rotas `/api/subscription/create` e `/api/pix/create` (Tasks 4/5), `planBySlug` de `src/lib/plans.ts`.
- Produces: fluxo de pagamento embutido; ao confirmar, navega para `/assinatura/sucesso`.

- [ ] **Step 1: página server carrega o plano**

```tsx
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SubscribeForm from "@/components/SubscribeForm";
import { PLANS } from "@/lib/plans";

export default async function AssinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = PLANS.find((p) => p.slug === slug);
  if (!plan) notFound();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Assinar {plan.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {(plan.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — cartão (mensal) ou Pix (30 dias).
        </p>
        <div className="mt-6"><SubscribeForm slug={plan.slug} /></div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: `SubscribeForm` client**

```tsx
"use client";
import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-browser";
import { btnPrimary } from "@/components/ui";

type Method = "card" | "pix";

function PaymentInner({ method }: { method: Method }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMsg(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/assinatura/sucesso` },
      redirect: "if_required",
    });
    if (error) {
      setMsg(error.message ?? "Não foi possível concluir o pagamento.");
      setBusy(false);
      return;
    }
    // Cartão: sucesso imediato. Pix: QR foi exibido pelo PaymentElement; a confirmação vem async.
    window.location.href = "/assinatura/sucesso";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <button className={btnPrimary} disabled={busy || !stripe}>
        {busy ? "Processando…" : method === "pix" ? "Gerar Pix" : "Pagar"}
      </button>
    </form>
  );
}

export default function SubscribeForm({ slug }: { slug: string }) {
  const [method, setMethod] = useState<Method>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start(m: Method) {
    setMethod(m);
    setClientSecret(null);
    setErr(null);
    setLoading(true);
    const route = m === "card" ? "/api/subscription/create" : "/api/pix/create";
    const res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.clientSecret) {
      setErr(data.error ?? "Falha ao iniciar pagamento.");
      return;
    }
    setClientSecret(data.clientSecret);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => start("card")}
          className={`flex-1 rounded-input border py-2 text-sm font-semibold transition-colors ${method === "card" ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}
        >
          Cartão (mensal)
        </button>
        <button
          type="button"
          onClick={() => start("pix")}
          className={`flex-1 rounded-input border py-2 text-sm font-semibold transition-colors ${method === "pix" ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}
        >
          Pix (30 dias)
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Iniciando…</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {clientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#ec4899" } } }}>
          <PaymentInner method={method} />
        </Elements>
      )}

      {!clientSecret && !loading && (
        <p className="text-xs text-muted">Escolha um método para continuar.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: build + commit**

Run: `npx tsc --noEmit && npm run build` → ok (as libs `@stripe/*` devem tipar sem erro).
```bash
git add src/app/assinar/[slug]/page.tsx src/components/SubscribeForm.tsx
git commit -m "feat(stripe): /assinar/[slug] + SubscribeForm (Payment Element embutido)"
```

---

### Task 10: `/assinatura/sucesso` (poll status) + botão gerenciar no `/perfil`

**Files:**
- Create: `src/app/assinatura/sucesso/page.tsx` (client)
- Create: `src/components/BillingButton.tsx` (client)
- Modify: `src/app/perfil/page.tsx` (mostra plano/status atual + BillingButton quando cartão)

**Interfaces:**
- Consumes: `/api/subscription/status` (Task 7), `/api/billing-portal` (Task 7).

- [ ] **Step 1: página de sucesso (poll)**

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SucessoPage() {
  const [state, setState] = useState<"checking" | "active" | "pending">("checking");

  useEffect(() => {
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      if (data.active) { setState("active"); clearInterval(id); }
      else if (tries >= 10) { setState("pending"); clearInterval(id); }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
      {state === "checking" && <p className="text-sm text-muted">Confirmando seu pagamento…</p>}
      {state === "active" && (
        <>
          <h1 className="font-display text-2xl font-extrabold text-ink">Assinatura ativa 🎉</h1>
          <p className="mt-2 text-sm text-muted">Seu anúncio já está visível.</p>
          <Link href="/perfil" className="mt-5 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white">Ir para meu painel</Link>
        </>
      )}
      {state === "pending" && (
        <>
          <h1 className="font-display text-xl font-bold text-ink">Pagamento em processamento</h1>
          <p className="mt-2 text-sm text-muted">Se pagou via Pix, a confirmação pode levar alguns instantes. Atualize esta página.</p>
          <Link href="/perfil" className="mt-5 rounded-pill border border-line px-5 py-2.5 text-sm font-semibold text-ink">Voltar ao painel</Link>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: BillingButton**

```tsx
"use client";
import { useState } from "react";
import { btnSecondary } from "@/components/ui";

export default function BillingButton() {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.url) window.location.href = data.url;
  }
  return <button onClick={open} disabled={busy} className={btnSecondary}>{busy ? "Abrindo…" : "Gerenciar assinatura"}</button>;
}
```

- [ ] **Step 3: mostrar status no `/perfil`**

No `src/app/perfil/page.tsx`, buscar a assinatura (status, method, current_period_end) — reutilizar a query existente se possível — e renderizar uma seção:

```tsx
import BillingButton from "@/components/BillingButton";
import { isActive } from "@/lib/subscription";
// ...
// depois de buscar `subRow = { status, method, current_period_end }`:
<section className={cardCls}>
  <h2 className="font-display text-base font-bold text-ink">Assinatura</h2>
  {isActive(subRow ?? null, new Date()) ? (
    <p className="mt-1 text-sm text-muted">
      Ativa ({subRow?.method === "pix" ? "Pix" : "Cartão"}) até {new Date(subRow!.current_period_end!).toLocaleDateString("pt-BR")}.
    </p>
  ) : (
    <p className="mt-1 text-sm text-muted">Sem assinatura ativa. <a href="/planos" className="text-accent underline">Ver planos</a>.</p>
  )}
  {subRow?.method === "card" && subRow?.stripe_customer_id && <div className="mt-3"><BillingButton /></div>}
</section>
```
(Ajustar o `select` para incluir `method, current_period_end, stripe_customer_id`.)

- [ ] **Step 4: build + commit**

Run: `npx tsc --noEmit && npm run build` → ok.
```bash
git add src/app/assinatura/sucesso/page.tsx src/components/BillingButton.tsx src/app/perfil/page.tsx
git commit -m "feat(stripe): sucesso (poll status) + gerenciar assinatura no perfil"
```

---

### Task 11: Verificação final + checklist de teste (test mode)

**Files:** nenhum (verificação).

- [ ] **Step 1: suite + build**

Run: `npm test` (todos verdes, incl. subscription) e `npx tsc --noEmit && npm run build` (sem erros; rotas novas listadas).

- [ ] **Step 2: checklist manual (controller, test mode)** — registrar resultado no relatório

Pré-requisitos (controller): `.env.local` com `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`; migration 0007 aplicada; `node scripts/stripe-setup.mjs` rodado (price ids gravados); Pix habilitado no dashboard test.

Fluxo webhook em dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (imprime o `whsec_...` → é o `STRIPE_WEBHOOK_SECRET` local). Sem Stripe CLI, a confirmação real do webhook é validada no deploy (endpoint do dashboard → URL Vercel).

Checar:
1. `/planos` mostra os 3 planos com preço/BRL correto.
2. Cartão de teste `4242 4242 4242 4242` (qualquer validade futura/CVC) → confirma → webhook `invoice.paid` → `subscriptions.status='active'` → anúncio aparece na home.
3. Pix de teste → PaymentElement exibe QR/copia-e-cola → simular pagamento (dashboard/CLI) → `payment_intent.succeeded` → `status='active'`, `current_period_end ≈ +30d`.
4. `/perfil` mostra "Assinatura ativa" e, no cartão, "Gerenciar assinatura" abre o Billing Portal.
5. Cancelar no portal → `customer.subscription.deleted` → status vira `canceled` → anúncio some do gate quando expira.

- [ ] **Step 3: commit do relatório (se houver ajustes)**

```bash
git commit -am "chore(stripe): verificacao test mode" --allow-empty
```

---

## Self-Review (autor)

- **Cobertura da spec:** §2 dados (Tasks 4–6 usam colunas existentes; Task 2 add unique) ✓; §3 config (Task 3) ✓; §4 cartão (Tasks 4,6,9) ✓; §5 Pix (Tasks 5,6,9) ✓; §6 webhook (Task 6) ✓; §7 portal (Tasks 7,10) ✓; §8 rotas/componentes (todas) ✓; §9 segurança (runtime nodejs, verify signature, valor no server, idempotência) ✓; §10 testes (Task 1 puro + Task 11 manual) ✓.
- **Placeholders:** nenhum "TODO/TBD"; todo código presente. Pontos que dependem do arquivo existente (`/perfil` já busca sub) estão marcados como "reutilizar query".
- **Consistência de tipos:** `isActive/pixPeriodEndISO/mapStripeStatus` idênticos entre Task 1 e usos (Tasks 6,7,10). `clientSecret`/`slug` consistentes entre rotas (4,5) e `SubscribeForm` (9). `onConflict:"profile_id"` depende da Task 2 (unique) — ordem respeitada.
- **Nota de execução:** confirmar o nome real da função de preço em `src/lib/format.ts` na Task 8 (usei `toLocaleString` inline p/ não depender de nome incerto).
