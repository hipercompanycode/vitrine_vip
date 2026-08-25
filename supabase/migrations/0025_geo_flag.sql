-- Sinal de geo (só pro admin): UF do acesso diferente da UF do anúncio.
-- Não pausa nada — é uma pista pra moderação olhar. País ≠ BR já força
-- reverificação (não usa este flag).
alter table public.profiles add column if not exists geo_flag text;
alter table public.profiles add column if not exists geo_flag_at timestamptz;
