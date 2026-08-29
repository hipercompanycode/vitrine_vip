-- Cooldown do story: a anunciante grava 1 story (ativo 24h) e só pode gravar
-- outro 24h depois DESSA gravação — mesmo que remova/oculte antes. Guardamos o
-- instante da última gravação separado da tabela stories (que é apagada ao remover).
alter table public.ads add column if not exists story_last_at timestamptz;
