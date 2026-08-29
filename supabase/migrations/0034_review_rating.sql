-- Nota (1–5 estrelas) na avaliação. Base pro rich snippet de estrelas no Google
-- (schema Product + AggregateRating). Avaliações antigas (só selos positivos)
-- viram 5 por padrão.
alter table public.reviews add column if not exists rating int not null default 5 check (rating between 1 and 5);
