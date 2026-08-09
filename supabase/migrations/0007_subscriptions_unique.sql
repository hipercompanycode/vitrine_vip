-- Uma assinatura corrente por profile. Permite webhook idempotente (upsert onConflict profile_id).
-- Se houver duplicatas de teste, remova-as antes (mantém a mais recente) — ver nota de aplicação.
create unique index if not exists subscriptions_profile_uniq on public.subscriptions (profile_id);
