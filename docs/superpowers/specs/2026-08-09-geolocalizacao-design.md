# Geolocalização (cidade + cidades próximas) — Design / Spec

**Data:** 2026-08-09
**Status:** Aprovado (design). Constrói sobre o app já ligado ao Supabase real.
**Próximo:** plano de implementação (1 fatia).

## 1. Visão geral

Visitante navega por **cidade** e por **cidades próximas (≤100km)**. Detecta a cidade
por **GPS** (com permissão) ou escolhe manualmente. Tudo **grátis** e nível-cidade, sem
mapa nem API paga. `lib/geo.ts` (haversine, nearestCity) já existe e está testado.

## 2. Dataset de cidades

- Fonte: dataset público IBGE de municípios com **nome, UF, latitude, longitude** (~5.570).
- **Script local** (`node scripts/gen-cities.mjs`) baixa o dataset e **gera o seed SQL**
  (`supabase/seed/cities_full.sql`) — os dados NÃO passam pelo chat.
- Semeia `public.cities (name, uf, lat, lng)` (tabela já existe). Aplicado no Supabase via SQL editor.
- Idempotente: `on conflict do nothing` (ou limpa+recria o conjunto no seed).

## 3. Cidades próximas (eficiente)

- Migration **0006**: função `public.nearby_city_ids(p_city_id int, p_km double precision)
  returns setof int` — dado o `city_id`, pega lat/lng da cidade, faz **pré-filtro por
  bounding-box** (`lat between … and …`, `lng between … and …` usando ~`km/111` para lat e
  ajuste por `cos(lat)` para lng) e refina com **haversine** (`< p_km`). Retorna os ids
  (inclui a própria cidade). Evita varrer 5.570 linhas no app.
- Índice em `cities(lat, lng)` para o bounding-box.

## 4. Seleção de cidade (persistente)

- **Cookie `city_id`** (id da cidade selecionada).
- **Sem cookie → home mostra todos os anúncios visíveis** (sem filtro geográfico).
- **Com cidade**:
  - Toggle "incluir cidades próximas" (cookie `nearby` = "1"/"0", padrão "1").
  - `nearby=1`: filtra anúncios por `city_id ∈ nearby_city_ids(city, 100)`.
  - `nearby=0`: filtra por `city_id = cidade`.

## 5. Filtro na home (HomeFilters funcional)

Hoje `HomeFilters` é shell. Passa a:
- **Seletor de cidade**: busca na lista (`cities`); ao escolher, seta cookie `city_id` e recarrega.
- **"Usar minha localização"**: botão que dispara GPS.
- **Toggle "cidades próximas"**: seta cookie `nearby` e recarrega.
- Mostra a cidade atual (do cookie) ou "Todas as cidades".

## 6. GPS

- Client: `navigator.geolocation.getCurrentPosition` → obtém lat/lng.
- Chama **`/api/geo/nearest?lat=&lng=`** (server): acha a cidade mais próxima (bounding-box +
  haversine sobre `cities`), **seta o cookie `city_id`** e responde `{ city }`.
- Client recarrega a home. Fallback: se GPS negado/erro, mantém seletor manual.
- Privacidade: lat/lng só usados no cálculo server-side; não vão a terceiros; não persistidos.

## 7. Rotas / componentes

- `GET /api/geo/nearest?lat&lng` — retorna e cookie da cidade mais próxima.
- `POST /api/geo/select` (form `city_id`) — seta cookie `city_id` (ou limpa) + `nearby`; redirect `/`.
- `src/lib/geo.ts` — reutiliza `haversineKm`, `nearestCity` (já existem).
- `HomeFilters` reescrito (client) + seletor.
- `src/app/page.tsx` — lê cookies (`city_id`, `nearby`); monta o conjunto de cidades e filtra os ads.

## 8. Modelo de dados

- `cities` (existe): populada com o dataset completo. + índice `(lat, lng)`.
- Função `nearby_city_ids`. Sem novas tabelas.

## 9. Testes

- `haversineKm`/`nearestCity`: já testados (Vitest).
- `nearestCity` usado pela rota — cobrir mapeamento lat/lng→cidade (unit, com fixture).
- Função `nearby_city_ids`: validada em SQL na config (ex.: nearby de São Paulo inclui Guarulhos/Osasco, exclui Rio).
- Manual/E2E: GPS→cidade, seletor manual, toggle próximas filtra a listagem.

## 10. Fora de escopo

- Mapa visual; raio ajustável; autocomplete/reverse-geocode externo (pago); ordenar por distância.
- Geo no detalhe/painel (só a home filtra).

## 11. Decisões registradas

- Dataset IBGE completo via script local (dados fora do chat).
- Próximas ≤100km via função SQL (bounding-box + haversine).
- Cookie `city_id` + `nearby`; sem cidade = todos os anúncios.
- GPS híbrido com fallback manual; privacidade preservada.
