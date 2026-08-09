# Pagamento Stripe (cartão recorrente + Pix avulso) — Design / Spec

**Data:** 2026-08-09
**Status:** Aprovado (design). Constrói sobre o app já ligado ao Supabase real.
**Arquitetura:** Stripe Elements / Payment Element **embutido** (sem redirect ao Checkout hospedado).
**Próximo:** plano de implementação (subagent-driven).

## 1. Visão geral

Anunciante assina um plano para tornar o anúncio visível (a home e o detalhe já
gateiam por `subscription` ativa). Dois métodos, ambos com o **Payment Element embutido**
no próprio app:

- **Cartão** — assinatura **recorrente** mensal (auto-renova) via Stripe Subscriptions.
- **Pix** — pagamento **avulso** que libera **30 dias** (sem auto-renovação; paga de novo
  ao expirar). Pix no Stripe é sempre one-time e assíncrono.

Começa em **test mode** (chaves de teste). Produção depois, trocando as chaves.

## 2. Modelo de dados (já existe — sem migration nova)

- `plans (id, slug, name, price_cents, bump_cooldown_minutes, allows_story, max_photos, max_videos, stripe_price_id)`.
  O `stripe_price_id` é preenchido pelo script de setup (um Price recorrente por plano).
- `subscriptions (id, profile_id, plan_id, status, method, current_period_end,
  stripe_customer_id, stripe_subscription_id, created_at)`.
  - `status`: `active | past_due | canceled | expired`.
  - `method`: `card | pix`.
  - Uma assinatura "ativa" = `status='active' AND current_period_end > now()` (regra já usada na home/detalhe).
- Sem tabelas novas. Se necessário, no máximo um índice único parcial para "uma ativa por profile"
  (decidir no plano; não obrigatório para o MVP).

## 3. Config do Stripe (test mode)

- `scripts/stripe-setup.mjs` (usa `STRIPE_SECRET_KEY` do `.env.local`):
  - Para cada plano (basico/pro/premium): cria (idempotente, por `lookup_key`/metadata) um
    **Product** + um **Price** recorrente mensal em **BRL** com o valor de `price_cents`.
  - Grava `plans.stripe_price_id` (via service-role) por `slug`.
- Pix **não** usa Price salvo — o valor vai inline no PaymentIntent (validado no server pelo plano).
- Habilitar **Pix** nos métodos de pagamento do dashboard (test mode).
- Segredos: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (server), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client).
  Lidos do dashboard do Stripe já logado no Chrome e gravados no `.env.local` (não passam pelo chat).

## 4. Fluxo — Cartão (assinatura recorrente)

1. `/planos` → "Assinar" no plano X → `/assinar/[slug]`.
2. Cliente escolhe **Cartão** → `POST /api/subscription/create`:
   - Reusa/cria o **Customer** do Stripe para o `profile_id` (guarda `stripe_customer_id`).
   - Cria **Subscription** com o `stripe_price_id` do plano, `payment_behavior: 'default_incomplete'`,
     `expand: ['latest_invoice.payment_intent']`, `metadata { profile_id, plan_id, method:'card' }`.
   - Retorna `{ clientSecret }` (do PaymentIntent da primeira fatura) + `subscriptionId`.
3. Cliente monta `<Elements clientSecret>` + `<PaymentElement/>`, usuário insere cartão,
   `stripe.confirmPayment({ elements, confirmParams:{ return_url:'/assinatura/sucesso' } })`.
4. **Webhook** confirma:
   - `invoice.paid` → grava/atualiza `subscriptions` `status='active'`, `current_period_end` =
     fim do período da fatura, `stripe_subscription_id`, `method='card'`.
   - Renovações mensais chegam como novas `invoice.paid` → estende `current_period_end`.
5. Página de sucesso mostra estado (a verdade é o webhook; a UI pode consultar o status).

## 5. Fluxo — Pix (avulso, 30 dias)

1. `/assinar/[slug]` → **Pix** → `POST /api/pix/create`:
   - Cria **PaymentIntent** `amount = plans.price_cents` (server, nunca do client), `currency:'brl'`,
     `payment_method_types:['pix']`, `metadata { profile_id, plan_id, method:'pix' }`.
   - Retorna `{ clientSecret }`.
2. Cliente monta o Payment Element (Pix) → `confirmPayment` → Stripe devolve o **QR code + copia-e-cola**,
   exibidos **dentro do app**. Usuário paga no app do banco.
3. Pix é **assíncrono**. **Webhook**:
   - `payment_intent.succeeded` (method pix) → grava `subscriptions` `status='active'`,
     `method='pix'`, `current_period_end = now + 30 dias`. Sem `stripe_subscription_id`.
   - `payment_intent.payment_failed`/expirado → nada (não ativa).
4. Ao expirar (`current_period_end` passou), o gate esconde o anúncio; usuário paga Pix de novo.

## 6. Webhook (`POST /api/stripe/webhook`) — fonte da verdade

- Lê o **raw body** e verifica a assinatura com `STRIPE_WEBHOOK_SECRET` (`stripe.webhooks.constructEvent`).
  Em Next 16 (App Router), a rota lê `await req.text()` (corpo cru) e o header `stripe-signature`.
- Escreve `subscriptions` **apenas** aqui, com **service-role** (RLS não se aplica ao service-role).
- Eventos tratados:
  - `invoice.paid` → cartão ativa/renova.
  - `payment_intent.succeeded` → Pix ativa +30 dias (filtra por `metadata.method='pix'`).
  - `customer.subscription.deleted` → `status='canceled'` (esconde ao fim do período).
  - `customer.subscription.updated` → sincroniza `status`/`current_period_end` (past_due, etc.).
- **Idempotência:** upsert por `profile_id` (uma assinatura corrente) ou dedupe por
  `stripe_subscription_id`/`payment_intent id`; reprocessar o mesmo evento não duplica nem corrompe.
- O cliente **nunca** ativa assinatura; só inicia intents. Valor/plano sempre resolvidos no server.

## 7. Gerenciar / cancelar

- `POST /api/billing-portal` (cartão): cria uma sessão do **Stripe Billing Portal** para o
  `stripe_customer_id` do usuário e retorna a URL (cancelar assinatura, trocar cartão).
- Botão "Gerenciar assinatura" no `/perfil` quando `method='card'`. Pix não tem o que cancelar.

## 8. Rotas / componentes

- `GET /planos` — cards dos 3 planos + CTA.
- `GET /assinar/[slug]` — seletor de método + Payment Element embutido (client component).
- `GET /assinatura/sucesso` — estado pós-pagamento (consulta status da assinatura do usuário).
- `POST /api/subscription/create` — cria Customer+Subscription incompleta (cartão).
- `POST /api/pix/create` — cria PaymentIntent Pix.
- `POST /api/stripe/webhook` — processa eventos (raw body, service-role).
- `POST /api/billing-portal` — sessão do portal (cartão).
- `src/lib/stripe.ts` — client server-side (secret key).
- `src/lib/subscription.ts` — regras puras: `isActive(sub, now)`, `pixPeriodEnd(now) = now + 30d`,
  mapeamento `event → { status, current_period_end, method, ids }`.
- `SubscribeCard`/`PixPayment` (client) — montam Elements/PaymentElement.
- `scripts/stripe-setup.mjs` — cria Products/Prices e grava `stripe_price_id`.

## 9. Segurança

- Secret key e webhook secret **só no server**; publishable key no client.
- Webhook **sempre** verifica a assinatura; rejeita corpo não assinado (400).
- Valor e plano resolvidos **no server** a partir do `slug`/`plan_id`; nunca confiar em valor do client.
- `metadata { profile_id }` amarra o pagamento ao usuário; o webhook confia no metadata (setado pelo server).
- Idempotência no webhook evita ativação/duplicação por reentrega.
- Nada de PAN/cartão tocando nosso server (Payment Element tokeniza no Stripe).

## 10. Testes

- `lib/subscription.ts`: `isActive` (ativo/expirado/cancelado), `pixPeriodEnd` (+30d), mapeamento
  de evento → linha (cartão vs pix) — Vitest, sem rede.
- Rotas: validação de entrada (plano válido, usuário logado, método), forma da resposta
  (`clientSecret`), rejeição de webhook sem assinatura. Lógica de negócio isolada em `lib/` para testar sem Stripe.
- Manual/E2E (test mode): assinar cartão de teste `4242…` → anúncio fica visível; Pix de teste →
  QR exibido, simular pagamento → webhook ativa; cancelar no portal → expira.

## 11. Decisões registradas

- Payment Element **embutido** (arquitetura B), não Checkout hospedado.
- Cartão = Subscription recorrente (`default_incomplete` + confirm no client + `invoice.paid`).
- Pix = PaymentIntent avulso + `payment_intent.succeeded` → +30 dias (sem auto-renovação).
- Webhook (service-role) é a única fonte de escrita de `subscriptions`; idempotente.
- Sem migration nova (schema já preparado). `stripe_price_id` preenchido por script.
- Test mode primeiro; chaves lidas do dashboard logado e gravadas no `.env.local`.

## 12. Fora de escopo (MVP)

- Trial, cupons/descontos, upgrade/downgrade proporcional (proration).
- Múltiplas assinaturas simultâneas por conta.
- Faturas/recibos customizados, e-mails transacionais próprios (Stripe já envia recibo).
- Pix recorrente (não existe no Stripe).
