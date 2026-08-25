-- Anti-fake por CPF: CPF na verificação (único por conta) + blocklist de banidos.

alter table public.verifications add column if not exists cpf text;

-- Um mesmo CPF não pode estar vinculado a duas contas (verificações) diferentes.
create unique index if not exists verifications_cpf_uniq
  on public.verifications (cpf) where cpf is not null;

-- Blocklist: guardamos só o HMAC do CPF (LGPD — não retém o CPF cru dos banidos).
-- Quando o admin recusa marcando "bloquear CPF", o hash entra aqui e novas
-- verificações com esse CPF são barradas.
create table if not exists public.blocked_cpfs (
  cpf_hash text primary key,
  reason text,
  blocked_by uuid,
  created_at timestamptz not null default now()
);

alter table public.blocked_cpfs enable row level security;
-- Sem policies de propósito: só o service-role (admin) acessa; barra todo o resto.
