-- Texto curto do card (até 240) + tabela de preços (vários serviços/faixas).
alter table public.ads add column if not exists headline text;
alter table public.ads add column if not exists price_table jsonb not null default '[]'::jsonb;
-- price_cents passa a guardar o MENOR preço da tabela (p/ filtro e "a partir de").
