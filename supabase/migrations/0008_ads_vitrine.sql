-- Campos p/ layout de vitrine (acompanhantes): idade e selo "Verificada".
-- age: idade anunciada (opcional). verified: selo controlado pelo admin.
alter table public.ads add column if not exists age int;
alter table public.ads add column if not exists verified boolean not null default false;
