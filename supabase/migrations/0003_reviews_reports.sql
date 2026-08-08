-- REVIEWS (avaliações: comentário opcional + selos; várias por usuário)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index reviews_ad_idx on public.reviews (ad_id, created_at desc);

-- REPORTS (denúncias)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake','golpe','outro')),
  details text,
  status text not null default 'open' check (status in ('open','reviewed')),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

alter table public.reviews enable row level security;
alter table public.reports enable row level security;

-- REVIEWS: leitura pública; dono (role comum) cria; dono apaga
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_owner_insert" on public.reviews for insert
  with check (auth.uid() = user_id and public.current_user_role() = 'comum');
create policy "reviews_owner_delete" on public.reviews for delete
  using (auth.uid() = user_id);

-- REPORTS: dono lê e cria (role comum). Admin lê/edita via service role (rota /admin).
create policy "reports_owner_read" on public.reports for select
  using (auth.uid() = user_id);
create policy "reports_owner_insert" on public.reports for insert
  with check (auth.uid() = user_id and public.current_user_role() = 'comum');
