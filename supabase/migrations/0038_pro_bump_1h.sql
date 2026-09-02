-- Pro: subir ao topo passa de 15 min para 1h (60 min). Premium segue "a qualquer hora" (0).
update public.plans set bump_cooldown_minutes = 60 where slug = 'pro';
