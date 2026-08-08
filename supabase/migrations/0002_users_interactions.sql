-- PAPEL no perfil
alter table public.profiles
  add column if not exists role text not null default 'comum'
  check (role in ('anunciante','comum'));

-- Helper: papel do usuário atual (SECURITY DEFINER evita recursão de RLS em profiles)
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- LIKES (curtidas)
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (ad_id, user_id)
);
create index likes_ad_idx on public.likes (ad_id);

-- FAVORITES
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (ad_id, user_id)
);
create index favorites_user_idx on public.favorites (user_id, created_at desc);

alter table public.likes     enable row level security;
alter table public.favorites enable row level security;

-- LIKES: leitura pública (para contagem); escrita só do dono E papel comum
create policy "likes_public_read" on public.likes for select using (true);
create policy "likes_owner_insert" on public.likes for insert
  with check (auth.uid() = user_id and public.current_user_role() = 'comum');
create policy "likes_owner_delete" on public.likes for delete
  using (auth.uid() = user_id);

-- FAVORITES: leitura/escrita só do dono E papel comum p/ inserir
create policy "favorites_owner_read" on public.favorites for select
  using (auth.uid() = user_id);
create policy "favorites_owner_insert" on public.favorites for insert
  with check (auth.uid() = user_id and public.current_user_role() = 'comum');
create policy "favorites_owner_delete" on public.favorites for delete
  using (auth.uid() = user_id);

-- Trigger de novo usuário: copia role do metadata (default 'comum')
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  wanted text := new.raw_user_meta_data->>'role';
begin
  insert into public.profiles (id, role)
  values (new.id, case when wanted in ('anunciante','comum') then wanted else 'comum' end)
  on conflict (id) do nothing;
  return new;
end; $$;
