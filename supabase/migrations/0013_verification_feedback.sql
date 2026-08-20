-- Feedback do admin ao recusar uma verificação (motivo mostrado ao anunciante).
alter table public.verifications
  add column if not exists feedback text;
