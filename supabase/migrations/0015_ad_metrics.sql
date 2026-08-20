-- Métricas do anúncio: visualizações e cliques no contato.
alter table public.ads
  add column if not exists views int not null default 0,
  add column if not exists contact_clicks int not null default 0;

create or replace function public.inc_ad_views(p_ad uuid)
returns void language sql as $$
  update public.ads set views = views + 1 where id = p_ad;
$$;

create or replace function public.inc_ad_contacts(p_ad uuid)
returns void language sql as $$
  update public.ads set contact_clicks = contact_clicks + 1 where id = p_ad;
$$;
