# Contas de Usuário + Interações — Design / Spec

**Data:** 2026-08-08
**Status:** Aprovado (design). Constrói sobre o Plano 1 (fundação de anúncios).
**Próximo:** plano de implementação.

## 1. Visão geral

Adiciona **papéis de conta** e **interações sociais** ao marketplace. Além do
anunciante (que paga e publica), entra o **usuário comum** (só interage) e o
**admin** (modera denúncias). Login passa a ser **só e-mail/senha** — Google removido.

## 2. Papéis

Três papéis, escolha **no cadastro** (fixa, não muda depois):

- **Anunciante** — paga assinatura, gerencia **1 anúncio**. **Não** curte/avalia/favorita/denuncia.
- **Usuário comum** — **não** anuncia. Curte, favorita, avalia e denuncia anúncios.
- **Admin** — flag `is_admin` no perfil, setada **manualmente** no banco. Modera denúncias.

Regras:
- Papel guardado em `profiles.role` ('anunciante' | 'comum').
- `is_admin` é ortogonal ao papel (normalmente um admin é uma conta à parte).
- Visitante **sem login** navega e vê tudo; para **interagir** precisa logar como `comum`.

## 3. Autenticação (mudança)

- **Remover login com Google** (botão na tela de login + fluxo OAuth).
- **E-mail/senha apenas** (Supabase Auth).
- **Cadastro** ganha seletor de papel: **Anunciante** ou **Usuário comum**.
  - O papel vai em `options.data.role` no `signUp` → o trigger `handle_new_user`
    grava `profiles.role`.
- Pós-login: anunciante → `/perfil`; comum → `/conta` (ou home). Admin → `/admin`.

## 4. Interações (usuário comum logado)

### 4.1 Curtir (like)
- Estilo Instagram: **alterna**, **1 por usuário por anúncio**.
- **Contador** exibido no **card** e no **detalhe**.

### 4.2 Favoritar
- Salva o anúncio na lista privada **Favoritos** do usuário.
- Alterna, 1 por usuário por anúncio. Só o dono vê seus favoritos.

### 4.3 Avaliar
- **Comentário opcional** + **selos opcionais**: `Igual à foto`, `Não é fake`, `Recomendo`.
- **Várias** avaliações por usuário por anúncio (sem limite), texto sem limite de tamanho.
- Aparecem na seção **Avaliações** do detalhe (mais recentes primeiro).
- Autor pode apagar as próprias.

### 4.4 Denunciar
- Motivo (1): `Fake/enganoso`, `Golpe`, `Outro` (+ texto em "Outro").
- Vai para o **painel admin**. Não oculta o anúncio automaticamente.

## 5. Admin / moderação

- Rota **/admin**, acessível só se `is_admin`.
- Lista de **denúncias** (mais recentes), com link para o anúncio.
- Ações: **ocultar** (`ads.status = 'hidden'`) e **reexibir** (`'active'`).
- Marcar denúncia como `reviewed`.

## 6. Modelo de dados

Alterações e novas tabelas:

- **profiles** (alterar): + `role text not null default 'comum'` ('anunciante'|'comum'),
  + `is_admin boolean not null default false`.
- **likes**: `id`, `ad_id → ads`, `user_id → profiles`, `created_at`. UNIQUE(ad_id, user_id).
- **favorites**: `id`, `ad_id`, `user_id`, `created_at`. UNIQUE(ad_id, user_id).
- **reviews**: `id`, `ad_id`, `user_id`, `comment text null`, `tags text[] not null default '{}'`,
  `created_at`. (várias por usuário — sem unique).
  - `tags` restrito ao conjunto `{igual_foto, nao_fake, recomendo}` (validado no servidor).
- **reports**: `id`, `ad_id`, `user_id`, `reason text` ('fake'|'golpe'|'outro'),
  `details text null`, `status text default 'open'` ('open'|'reviewed'), `created_at`.
- **ads**: usa `status` existente (`active`/`hidden`).

Contagens (curtidas, etc.): calculadas por `count()` na leitura (agregado por `ad_id`
para a listagem; simples para o detalhe). Sem coluna denormalizada agora.

## 7. Segurança (RLS)

- **likes / favorites / reviews / reports**: `insert`/`delete` só por usuário autenticado
  cujo `profiles.role = 'comum'` e `user_id = auth.uid()`.
- **likes**: leitura pública (para contar/exibir).
- **reviews**: leitura pública (aparecem no anúncio).
- **favorites**: leitura só do dono (`user_id = auth.uid()`).
- **reports**: leitura só do **dono** ou de **admin** (`is_admin`); escrita: dono cria.
- **admin**: `is_admin` pode `select` reports e `update ads.status`.
- Papel `anunciante` **não** consegue inserir like/favorite/review/report (checado por RLS
  via `profiles.role`).
- Reforço no servidor (rotas) além da RLS para mutações sensíveis.

## 8. Telas

- **/cadastro** (ou /login com aba): seletor de papel + e-mail/senha. Sem Google.
- **Detalhe do anúncio** (`/anuncio/[id]`): botões **Curtir** (contador), **Favoritar**,
  **Denunciar** (modal com motivo); seção **Avaliações** (lista + form: texto + selos).
- **/conta** (usuário comum): **Favoritos** + **Minhas avaliações**.
- **Card**: contador de curtidas.
- **/admin**: fila de denúncias + ocultar/reexibir.

## 9. Testes

- Unit: validação de `tags` (só selos permitidos), motivos de denúncia válidos,
  toggle de like/favorite (idempotência do estado).
- Integração: RLS — comum interage, anunciante não; favoritos privados; admin vê reports.
- Manual/E2E: cadastro por papel, curtir/favoritar/avaliar/denunciar, painel admin oculta.

## 10. Fora de escopo (agora)

- Auto-ocultar após X denúncias.
- Notificações (e-mail/in-app).
- Resposta do anunciante às avaliações.
- Reputação/nota agregada por selos (só exibir selos por avaliação).
- Migração de contas existentes de papel (assume base nova; anunciantes atuais teriam `role='anunciante'` setado manual se necessário).

## 11. Decisões registradas

- 3 papéis; escolha fixa no cadastro; login só e-mail/senha (sem Google).
- Curtir (contador) **e** favoritar (lista privada) são ações distintas.
- Avaliar = comentário opcional + selos (`Igual à foto`, `Não é fake`, `Recomendo`), várias por usuário.
- Denúncia: `Fake/enganoso`, `Golpe`, `Outro`; opção **B** (registra + painel admin).
- Papéis estritos: anunciante não interage; comum não anuncia.
