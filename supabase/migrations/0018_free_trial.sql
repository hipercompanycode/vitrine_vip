-- Teste grátis de 7 dias (controlado no app; sem Stripe até assinar de fato).
-- trial_used impede repetir o teste. O teste em si é uma linha em subscriptions (method='trial').
alter table public.profiles
  add column if not exists trial_used boolean not null default false;
