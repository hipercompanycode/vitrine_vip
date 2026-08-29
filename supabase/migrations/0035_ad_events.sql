-- Eventos do anúncio (com data) para o painel de métricas: série por dia,
-- tendência, horário/dia de pico, taxa de contato. Os contadores totais em
-- ads.views / ads.contact_clicks continuam (resumo rápido).
create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  ad_id uuid not null references public.ads(id) on delete cascade,
  kind text not null,               -- 'view' | 'contact'
  created_at timestamptz not null default now()
);
create index if not exists ad_events_ad_kind_idx on public.ad_events (ad_id, kind, created_at desc);
create index if not exists ad_events_ad_created_idx on public.ad_events (ad_id, created_at desc);

-- RLS ligada, sem policies: leitura/escrita só via service role nas rotas do servidor.
alter table public.ad_events enable row level security;
