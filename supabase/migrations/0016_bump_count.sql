-- Contador de subidas (bumps) do anúncio.
alter table public.ads
  add column if not exists bump_count int not null default 0;

-- Sobe o anúncio: atualiza bumped_at e incrementa o contador de subidas.
create or replace function public.bump_ad(p_ad uuid)
returns void language sql as $$
  update public.ads set bumped_at = now(), bump_count = bump_count + 1 where id = p_ad;
$$;
