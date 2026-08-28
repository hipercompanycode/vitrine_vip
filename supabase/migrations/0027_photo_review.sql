-- Moderação por foto (ECA Digital): nudez total borrada pra quem não está logado.
-- review: 'pendente' (nova, escondida do público até revisar) / 'nudez' (borrada
-- pra anônimo, nítida pra logado) / 'liberada' (nítida pra todos).
-- blur_path: cópia borrada (gerada no servidor) servida ao anônimo.
alter table public.ad_media add column if not exists review text not null default 'pendente';
alter table public.ad_media add column if not exists blur_path text;
create index if not exists ad_media_review_idx on public.ad_media (review);

-- Fotos que já existem estão no ar -> tratamos como liberadas (não some nada).
update public.ad_media set review = 'liberada' where review = 'pendente';
