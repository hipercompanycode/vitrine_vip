-- Áudio de voz do anúncio (a acompanhante grava/­envia um curto áudio para o
-- cliente ouvir a voz dela). Fica no bucket público ad-media; caminho aqui.
alter table public.ads add column if not exists audio_path text;
