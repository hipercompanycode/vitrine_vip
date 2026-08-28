-- Avaliações com resposta da anunciante + moderação.
-- status: 'aguardando' (oculta até responder/aprovar ou vencer o prazo) /
--         'publicada' (aparece) / 'moderacao' (enviada ao admin, oculta até decisão).
-- due_at: created_at + 7 dias — se ninguém agir até lá, publica sozinha.
alter table public.reviews add column if not exists status text not null default 'aguardando';
alter table public.reviews add column if not exists reply text;
alter table public.reviews add column if not exists reply_at timestamptz;
alter table public.reviews add column if not exists due_at timestamptz;
alter table public.reviews add column if not exists moderation_at timestamptz;
create index if not exists reviews_status_idx on public.reviews (status);

-- Avaliações que já existem estão no ar -> publicadas (não some nada).
update public.reviews set status = 'publicada' where status = 'aguardando';
