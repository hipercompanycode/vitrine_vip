-- "Disponível agora" expira sozinho em 1h (o anunciante pode esquecer de desligar).
alter table public.ads
  add column if not exists available_since timestamptz;
