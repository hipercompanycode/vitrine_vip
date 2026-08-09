-- Unique para permitir re-seed idempotente sem quebrar FK
alter table public.cities add constraint if not exists cities_name_uf_uniq unique (name, uf);
create index if not exists cities_latlng_idx on public.cities (lat, lng);

-- Cidade mais próxima de um ponto (ordena pelo termo haversine, monotônico com a distância)
create or replace function public.nearest_city_id(p_lat double precision, p_lng double precision)
returns int language sql stable as $$
  select id from public.cities
  order by (
    power(sin(radians(lat - p_lat) / 2), 2) +
    cos(radians(p_lat)) * cos(radians(lat)) * power(sin(radians(lng - p_lng) / 2), 2)
  )
  limit 1;
$$;

-- Ids das cidades a ≤ p_km de p_city_id (inclui a própria); bounding-box + haversine
create or replace function public.nearby_city_ids(p_city_id int, p_km double precision)
returns setof int language sql stable as $$
  with c as (select lat, lng from public.cities where id = p_city_id)
  select ci.id
  from public.cities ci, c
  where ci.lat between c.lat - (p_km / 111.0) and c.lat + (p_km / 111.0)
    and ci.lng between c.lng - (p_km / (111.0 * cos(radians(c.lat)))) and c.lng + (p_km / (111.0 * cos(radians(c.lat))))
    and 2 * 6371 * asin(sqrt(
      power(sin(radians(ci.lat - c.lat) / 2), 2) +
      cos(radians(c.lat)) * cos(radians(ci.lat)) * power(sin(radians(ci.lng - c.lng) / 2), 2)
    )) <= p_km;
$$;
