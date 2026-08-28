-- Suporte ao anunciante: ticket (mensagem avulsa ou chat) + mensagens da conversa.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'mensagem',   -- 'mensagem' | 'chat'
  subject text,
  status text not null default 'aberto',    -- 'aberto' | 'fechado'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_profile_idx on public.support_tickets (profile_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  from_admin boolean not null default false, -- false = anunciante, true = suporte/admin
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- RLS ligada, sem policies: todo acesso passa por rotas no servidor (dono/admin).
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
