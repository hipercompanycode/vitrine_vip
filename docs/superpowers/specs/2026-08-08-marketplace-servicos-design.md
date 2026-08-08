# Marketplace de Serviços — Design / Spec

**Data:** 2026-08-08
**Status:** Aprovado (design). Próximo passo: plano de implementação.

## 1. Visão geral

Site de anúncios de serviços. Prestadores publicam **1 anúncio por conta**, mantido
visível por **assinatura mensal** (3 planos). Visitantes navegam **sem login**, filtram
por **cidade + cidades próximas (≤100km)** e entram em contato via **WhatsApp**.

Objetivo: visual bonito e simples, foco em cards de anúncio, geolocalização leve,
extras por plano (story de 24h, bump pro topo).

## 2. Stack

| Camada | Tecnologia |
|--------|-----------|
| Front + API | Next.js (App Router) + React |
| Estilo | Tailwind CSS |
| Banco / Auth / Storage | Supabase (Postgres) |
| Pagamento | Stripe (cartão recorrente + Pix avulso) |
| Deploy | Vercel |

## 3. Planos e monetização

- Modelo: **assinatura mensal** por anúncio. **1 anúncio por conta**.
- Anúncio só é **visível publicamente enquanto a assinatura está ativa**. Ao vencer,
  o anúncio é **ocultado** (não apagado) e pode ser reativado renovando.

| Plano | Preço/mês | Bump (cooldown) | Story 24h | Fotos | Vídeos |
|-------|-----------|-----------------|-----------|-------|--------|
| Básico | R$ 39,90 | a cada 60 min | ❌ | 6 | 1 |
| Pro | R$ 69,90 | a cada 15 min | ✅ | 12 | 3 |
| Premium | R$ 99,90 | sem cooldown | ✅ | 12 | 3 |

## 4. Modelo de dados (Postgres / Supabase)

Tabelas principais:

- **profiles** (1:1 com `auth.users`)
  - `id` (uuid, = auth.users.id), `name`, `whatsapp`, `city_id`, `created_at`
- **plans**
  - `id`, `slug` (basico/pro/premium), `name`, `price_cents`,
    `bump_cooldown_minutes`, `allows_story` (bool), `max_photos`, `max_videos`,
    `stripe_price_id`
- **subscriptions**
  - `id`, `profile_id`, `plan_id`, `status` (active/past_due/canceled/expired),
    `method` (card/pix), `current_period_end` (timestamptz),
    `stripe_customer_id`, `stripe_subscription_id` (null p/ pix), `created_at`
- **ads** (1 por conta → `profile_id` unique)
  - `id`, `profile_id` (unique), `title`, `description`, `price_cents`,
    `city_id`, `is_available` (bool), `bumped_at` (timestamptz),
    `status` (active/hidden), `created_at`, `updated_at`
- **ad_media**
  - `id`, `ad_id`, `type` (photo/video), `storage_path`, `position` (int), `created_at`
- **stories**
  - `id`, `ad_id`, `storage_path` (vídeo), `created_at`, `expires_at`
  - Ativo quando `now() < expires_at` (`expires_at = created_at + interval '24 hours'`)
- **cities** (dataset IBGE, seed)
  - `id`, `name`, `uf`, `lat`, `lng`

Regras derivadas:
- Limites de fotos/vídeos e permissão de story **validados no servidor** conforme o
  plano da assinatura ativa.
- Visibilidade pública do anúncio: `status = active` **E** assinatura `active` **E**
  `current_period_end > now()`.

## 5. Funcionalidades

### 5.1 Home / listagem
- Grid de **cards**: foto de capa, **nome**, **descrição curta** (truncada), **preço**,
  cidade, "há X h" (tempo desde `created_at`), badge **Disponível agora**,
  **anel de story** quando há story ativo.
- Ordenação: `bumped_at DESC NULLS LAST`, depois `created_at DESC`.
- Filtro por cidade + toggle "incluir cidades próximas (≤100km)".
- Busca por texto (título/descrição). Sem categorias.

### 5.2 Geolocalização (leve, sem API paga)
- Ao abrir: tenta **GPS do navegador** (permissão). Com lat/lng, acha a **cidade mais
  próxima** na tabela `cities` (haversine). Se negar/erro → **seletor manual** com busca.
- "Cidades próximas" = todas as `cities` a ≤100km da cidade selecionada (haversine).
  Implementado via função SQL/consulta. Visitante pode trocar de cidade livremente.

### 5.3 Story de 24h
- Vídeo curto. Aparece na **capa do card** (anel/preview) e abre em **tela cheia**.
- Some automaticamente após 24h (`expires_at`). Só planos **Pro/Premium**.
- 1 story ativo por anúncio (novo substitui o anterior).

### 5.4 Subir (bump)
- Botão no painel do anunciante. Atualiza `bumped_at = now()`.
- Respeita **cooldown do plano** (validação no servidor). Premium sem cooldown.
- UI mostra quando poderá subir de novo.

### 5.5 Disponível agora
- Toggle manual no painel → `is_available`. Badge verde no card.

### 5.6 Contato
- Botão **WhatsApp** que abre `https://wa.me/<numero>` com mensagem pré-preenchida.

## 6. Pagamento (Stripe)

### 6.1 Cartão (recorrente)
- Stripe **Checkout** modo `subscription` com o `stripe_price_id` do plano.
- Webhooks: `checkout.session.completed`, `customer.subscription.updated/deleted`,
  `invoice.paid`, `invoice.payment_failed` → atualizam `subscriptions.status` e
  `current_period_end`.
- Renovação automática. **Customer Portal** do Stripe para trocar cartão/cancelar.

### 6.2 Pix (avulso, renovação manual)
- Stripe Checkout/PaymentIntent modo `payment` com método **pix**.
- Ao confirmar (webhook `payment_intent.succeeded` / `checkout.session.completed`):
  `method = pix`, `status = active`, `current_period_end = max(now, atual) + 30 dias`.
- **Sem débito automático.** Banner/aviso quando faltar pouco pra vencer; botão "Renovar via Pix".

### 6.3 Requisitos
- Conta **Stripe Brasil** (CPF/CNPJ + conta bancária BR) para habilitar Pix.
- Modo de teste primeiro; produção depois.

## 7. Autenticação e segurança

- **Supabase Auth**: e-mail/senha + Google OAuth. **Só o anunciante loga**; visitante é anônimo.
- **RLS (Row Level Security)**:
  - `ads`, `ad_media`, `stories`, `profiles` (campos públicos): leitura pública **apenas
    de anúncios visíveis** (status active + assinatura ativa).
  - Escrita: dono (`auth.uid() = profile_id`) apenas.
  - `plans`, `cities`: leitura pública.
  - `subscriptions`: leitura só do dono; escrita só via service role (webhooks).
- Validações de limite/plano e mutações sensíveis via **rotas de servidor** (service role),
  nunca confiando só no cliente.
- Webhook do Stripe valida assinatura do evento.

## 8. Painel do anunciante (`/perfil`)

- Criar/editar anúncio (título, descrição, preço, cidade).
- Upload de mídias com **limite por plano** (fotos/vídeos), reordenar.
- Toggle **Disponível agora**.
- Botão **Subir** (com estado de cooldown).
- Enviar **story 24h** (Pro/Premium).
- Ver **status da assinatura** e vencimento; gerenciar pagamento (portal Stripe / renovar Pix).

## 9. Storage (Supabase)

- Buckets: `ad-media` (fotos/vídeos do anúncio) e `stories`. Leitura pública; escrita
  restrita ao dono via policy. Caminhos por `profile_id`/`ad_id`.

## 10. Setup / configuração (via navegador, após o usuário criar contas)

O usuário cria e loga nas contas; o assistente configura:
- Supabase: criar projeto, aplicar migrations + RLS, criar buckets, pegar chaves.
- Stripe: criar produtos/preços dos 3 planos, habilitar Pix, criar webhook, pegar chaves.
- Vercel: importar repo, setar env vars, deploy.
- `.env` com chaves Supabase (URL, anon, service role) e Stripe (secret, publishable,
  webhook secret).

## 11. Testes

- Unit: lógica de **cooldown de bump**, **cálculo de distância (haversine)**,
  **validação de limites por plano**, cálculo de `current_period_end` (Pix +30d).
- Integração: fluxo de webhook Stripe (test mode), visibilidade por RLS.
- Manual/E2E: publicar anúncio, assinar (cartão test + Pix test), subir, story, filtro por cidade.

## 12. Fora de escopo (MVP)

- Chat interno (usa WhatsApp).
- Categorias (só busca por texto).
- Múltiplos anúncios por conta.
- Moderação avançada / denúncias (pode entrar depois).
- App mobile nativo (site responsivo cobre).

## 13. Decisões registradas

- Monetização: assinatura mensal, 1 anúncio/conta (resp. B + A).
- Bump: grátis, repetível, cooldown por plano.
- 3 planos: R$39,90 / R$69,90 / R$99,90.
- Geo: híbrido GPS→manual, raio 100km, dataset IBGE local.
- Contato: WhatsApp direto.
- Sem categorias.
- Stack: Next.js + Vercel + Supabase + Stripe.
- Pix = renovação manual +30d; cartão = recorrente.
