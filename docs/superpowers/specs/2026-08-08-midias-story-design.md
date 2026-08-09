# Fotos/Vídeos + Story 24h — Design / Spec

**Data:** 2026-08-08
**Status:** Aprovado (design). Constrói sobre Plano 1 + 2A + 2B.
**Próximo:** plano de implementação (2 fatias: 3A mídias, 3B story).

## 1. Visão geral

Anúncios ganham **fotos e vídeos** (limites por plano) e um **story de 24h**. As
tabelas `ad_media` e `stories` já existem (migração 0001). Falta: upload, exibição
(capa, galeria, story inline) e gestão no painel.

## 2. Limites

- **Fotos:** até **15 MB** cada (jpg/png/webp). Qualidade alta priorizada.
- **Vídeos:** até **60s** e **150 MB** cada (mp4/webm).
- **Story:** 1 vídeo, até **60s** (mesmo teto de tamanho).
- **Contagem por plano** (coluna `plans.max_photos`/`max_videos`, já semeada):
  - Básico: 6 fotos, 1 vídeo, **sem story**.
  - Pro / Premium: 12 fotos, 3 vídeos, **com story**.
- Aceitável migrar o Supabase Storage pro plano pago se o volume exigir.

## 3. Arquitetura de upload (decisão-chave)

- **Upload direto navegador → Supabase Storage**, NÃO via rota Next.
  - Motivo: na Vercel o corpo de request de função serverless é limitado (~4.5 MB);
    um vídeo de 150 MB **precisa** ir direto pro Storage (o supabase-js do browser faz isso).
- **Caminho:** `{user_id}/{ad_id}/{uuid}.{ext}` no bucket.
- **Storage RLS:** usuário autenticado só grava/atualiza/apaga objetos sob o próprio
  prefixo `{auth.uid()}/...`; leitura pública.
- **Tamanho:** teto aplicado pelo bucket (máx 150 MB por arquivo).
- **Duração 60s:** validada **no cliente** (lê `loadedmetadata` do `<video>`) antes de subir.
- **Contagem por plano + tipo:** validada numa **rota de servidor** (`/api/media`) ao
  registrar a mídia em `ad_media` (conta atuais vs `max_photos`/`max_videos` do plano ativo).
- Fluxo: (1) cliente valida tipo/tamanho/duração; (2) sobe pro Storage no path do dono;
  (3) chama `/api/media` que revê contagem/plano e insere a linha em `ad_media`
  (se recusar, o cliente remove o objeto órfão do Storage).

## 4. Modelo de dados

- **ad_media** (existe): `type` ('photo'|'video'), `storage_path`, `position`, `created_at`.
  - **Adicionar** `is_cover boolean not null default false`.
  - **Uma capa por anúncio**: marcar capa limpa `is_cover` das demais (lógica no servidor).
- **stories** (existe): `ad_id`, `storage_path`, `created_at`, `expires_at = created_at + 24h`.
  - **1 story ativo** por anúncio (novo substitui/expira o anterior).
- **Buckets Storage:** `ad-media` (fotos+vídeos), `stories` (vídeo). Público leitura;
  escrita restrita ao dono via Storage policy.

## 5. Exibição

### 5.1 Capa / card
- Componente **`StoryCover`** ocupa a área da capa (card e detalhe).
- Mostra a **foto marcada como capa**; se não houver foto, mantém o **placeholder atual**
  (gradiente + monograma).
- Se houver **story ativo**: **botão de play** sobre a capa. Ao tocar, o **story roda no
  lugar da capa** (vídeo inline, com som, `playsInline`). Ao terminar, volta pra capa.
- Sem autoplay na listagem (leve). O resto do card continua clicável → detalhe (o botão
  de play fica acima do link esticado, como o WhatsApp).

### 5.2 Detalhe
- **Galeria**: todas as fotos + vídeos (faixa de miniaturas rolável; toca pra ver grande).
- A capa grande também é `StoryCover` (play do story no lugar).
- Home passa a usar a **foto de capa** no lugar do placeholder quando existir.

## 6. Painel do anunciante

- **Mídias:** enviar fotos/vídeos respeitando limites e **contagem do plano** (UI mostra
  quanto resta); miniaturas; **apagar**; **marcar capa**.
- **Story** (Pro/Premium): enviar vídeo 24h; ver **tempo restante**; substituir/remover.
- Barra de progresso de upload; mensagens de erro (tipo/tamanho/duração/limite do plano).

## 7. Segurança (RLS)

- **Storage** (`ad-media`, `stories`): `insert/update/delete` só onde o primeiro segmento
  do path == `auth.uid()`; `select` público.
- **ad_media / stories** (tabelas): leitura pública só de anúncio **visível** (regra do
  Plano 1 — `is_ad_visible`); dono `insert/delete`.
- Rota `/api/media` (server) valida ownership + contagem por plano antes de inserir.
- Duração de vídeo é validada no cliente (defesa best-effort; tamanho tem teto no bucket).

## 8. Testes

- Unit: cálculo de "quantas mídias ainda cabem" por plano/tipo; validação de tipo/tamanho
  (MIME e bytes) pura; expiração do story (`isStoryActive(expires_at, now)`).
- Integração: rota `/api/media` recusa quando excede o plano; RLS de Storage por prefixo.
- Manual/E2E: upload foto/vídeo, marcar capa, galeria no detalhe, enviar story e ver
  inline no card, expiração após 24h.

## 9. Fora de escopo

- Transcodificação/compressão de vídeo; thumbnails gerados no servidor (usa `<video preload=metadata>` / poster da própria capa).
- Edição de imagem, crop.
- Múltiplos stories simultâneos; stories de foto (é vídeo).
- CDN externo (usa o CDN do Supabase Storage).

## 10. Decomposição (2 planos)

- **Plano 3A — Mídias:** bucket + Storage RLS, `ad_media.is_cover`, upload direto
  (cliente) + rota `/api/media` (contagem por plano), marcar capa, apagar, galeria no
  detalhe, capa no card/home, painel de mídias.
- **Plano 3B — Story:** bucket stories, upload de story (Pro/Premium), `StoryCover` com
  play inline no card/detalhe, expiração 24h, gestão no painel.

## 11. Decisões registradas

- Vídeos ≤ 60s; fotos até 15 MB (qualidade); story 1 vídeo ≤ 60s.
- Capa **escolhida manualmente** (uma foto marcada `is_cover`).
- Story: **botão de play na capa**; vídeo **roda no lugar da capa** (inline), não anel nem fullscreen.
- Upload **direto pro Storage** (limite de body da Vercel); contagem por plano validada no servidor.
- Grátis: usa Storage do Supabase; sem transcodificação.
