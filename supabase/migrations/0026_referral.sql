-- Indicação entre anunciantes: cada perfil tem um código único (ref_code) pra
-- compartilhar; quem se cadastra usando um código fica com referred_by apontando
-- pro perfil que indicou. Sem recompensa automática — só rastreio + exibição.
alter table public.profiles add column if not exists ref_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
create unique index if not exists profiles_ref_code_uniq on public.profiles (ref_code) where ref_code is not null;
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
