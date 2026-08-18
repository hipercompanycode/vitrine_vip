-- Atributos/tags do perfil p/ filtros (etnia, cabelo, serviços, lugar, etc.).
-- Array de slugs (ver src/lib/attributes.ts). Filtro usa overlaps/contains.
alter table public.ads add column if not exists attributes text[] not null default '{}';
create index if not exists ads_attributes_gin on public.ads using gin (attributes);
