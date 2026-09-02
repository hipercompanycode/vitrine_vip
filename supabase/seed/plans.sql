insert into public.plans (slug, name, price_cents, bump_cooldown_minutes, allows_story, max_photos, max_videos)
values
  ('free','Grátis',0,-1,false,6,0),
  ('pro','Pro',9990,60,true,12,3),
  ('premium','Premium',14990,0,true,12,3)
on conflict (slug) do update set
  name=excluded.name, price_cents=excluded.price_cents,
  bump_cooldown_minutes=excluded.bump_cooldown_minutes,
  allows_story=excluded.allows_story, max_photos=excluded.max_photos, max_videos=excluded.max_videos;
