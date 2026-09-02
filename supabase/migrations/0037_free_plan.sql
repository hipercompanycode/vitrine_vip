-- Plano Grátis vitalício (freemium). Substitui o teste de 7 dias: todo perfil
-- aprovado passa a ganhar este plano (sem cobrança, sem vencimento real).
-- Limites do Grátis: 6 fotos, sem story/áudio/subir/disponível/selo TOP.
-- (Os flags allows_audio/allows_bump/allows_availability/top_seal ficam no
--  código em src/lib/plans.ts; o banco guarda só o essencial p/ as queries.)
insert into public.plans (slug, name, price_cents, bump_cooldown_minutes, allows_story, max_photos, max_videos)
values ('free', 'Grátis', 0, -1, false, 6, 0)
on conflict (slug) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  bump_cooldown_minutes = excluded.bump_cooldown_minutes,
  allows_story = excluded.allows_story,
  max_photos = excluded.max_photos,
  max_videos = excluded.max_videos;
