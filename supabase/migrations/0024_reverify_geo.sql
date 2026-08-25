-- Reverificação de vivacidade (anti-revenda de perfil) + sinal de geo por IP.
alter table public.verifications add column if not exists verified_at timestamptz;
alter table public.verifications add column if not exists reverify_due timestamptz;
alter table public.verifications add column if not exists reverify_forced boolean not null default false;
alter table public.verifications add column if not exists reverify_reason text;
alter table public.verifications add column if not exists prev_face_path text; -- selfie anterior (admin compara)

alter table public.profiles add column if not exists last_country text;
alter table public.profiles add column if not exists last_ip text;
alter table public.profiles add column if not exists last_seen timestamptz;

-- status ganha o valor 'reverify' (além de pending/approved/rejected). É só texto,
-- não precisa de constraint nova.

-- Backfill: quem já está aprovado ganha a janela de 30 dias a partir de agora.
update public.verifications
   set verified_at = coalesce(verified_at, reviewed_at, now()),
       reverify_due = coalesce(reverify_due, now() + interval '30 days')
 where status = 'approved';
