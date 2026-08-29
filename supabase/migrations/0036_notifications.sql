-- Notificações in-app do anunciante (sino no painel). Sem serviço externo.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,                 -- 'moderation' | 'review' | 'support' | 'sistema'
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (profile_id) where read_at is null;

alter table public.notifications enable row level security;
-- O dono lê e marca como lida as suas. Inserts só via service role (rotas no servidor).
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = profile_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
