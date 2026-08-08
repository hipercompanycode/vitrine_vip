insert into public.cities (name, uf, lat, lng) values
  ('São Paulo','SP',-23.5505,-46.6333),
  ('Guarulhos','SP',-23.4543,-46.5337),
  ('Osasco','SP',-23.5329,-46.7916),
  ('Campinas','SP',-22.9099,-47.0626),
  ('Santo André','SP',-23.6639,-46.5383),
  ('Rio de Janeiro','RJ',-22.9068,-43.1729),
  ('Niterói','RJ',-22.8832,-43.1034),
  ('Belo Horizonte','MG',-19.9167,-43.9345),
  ('Curitiba','PR',-25.4284,-49.2733),
  ('Porto Alegre','RS',-30.0346,-51.2177)
on conflict do nothing;
