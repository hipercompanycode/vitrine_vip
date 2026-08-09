-- ============================================================
-- APLICAR UMA VEZ em um projeto Supabase NOVO (SQL Editor).
-- Ordem: 0001 init -> 0002 users/interactions -> 0003 reviews/reports -> seeds.
-- (Mídias 0004 entra depois, quando o Plano 3A estiver pronto.)
-- ============================================================

-- ===== 0001_init =====
-- Extensões
create extension if not exists "pgcrypto";

-- CITIES
create table public.cities (
  id serial primary key,
  name text not null,
  uf text not null,
  lat double precision not null,
  lng double precision not null
);
create index cities_uf_idx on public.cities (uf);

-- PLANS
create table public.plans (
  id serial primary key,
  slug text unique not null,
  name text not null,
  price_cents int not null,
  bump_cooldown_minutes int not null,
  allows_story boolean not null default false,
  max_photos int not null,
  max_videos int not null,
  stripe_price_id text
);

-- PROFILES (1:1 auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  whatsapp text not null default '',
  city_id int references public.cities(id),
  created_at timestamptz not null default now()
);

-- SUBSCRIPTIONS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id int not null references public.plans(id),
  status text not null default 'expired', -- active/past_due/canceled/expired
  method text,                            -- card/pix
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);
create index subscriptions_profile_idx on public.subscriptions (profile_id);

-- ADS (1 por conta)
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  price_cents int not null default 0,
  city_id int references public.cities(id),
  is_available boolean not null default false,
  bumped_at timestamptz,
  status text not null default 'active', -- active/hidden
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ads_sort_idx on public.ads (bumped_at desc nulls last, created_at desc);
create index ads_city_idx on public.ads (city_id);

-- AD_MEDIA
create table public.ad_media (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  type text not null, -- photo/video
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index ad_media_ad_idx on public.ad_media (ad_id, position);

-- STORIES
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index stories_ad_idx on public.stories (ad_id, expires_at desc);

-- RLS
alter table public.profiles     enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ads          enable row level security;
alter table public.ad_media     enable row level security;
alter table public.stories      enable row level security;
alter table public.plans        enable row level security;
alter table public.cities       enable row level security;

-- Helpers SECURITY DEFINER: bypass RLS para checagem de visibilidade pública
create or replace function public.has_active_subscription(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.profile_id = p_profile_id
      and s.status = 'active'
      and s.current_period_end > now()
  );
$$;

create or replace function public.is_ad_visible(p_ad_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ads a
    where a.id = p_ad_id and a.status = 'active'
      and public.has_active_subscription(a.profile_id)
  );
$$;

-- Leitura pública de plans e cities
create policy "plans_public_read" on public.plans for select using (true);
create policy "cities_public_read" on public.cities for select using (true);

-- profiles: dono lê/edita o seu; leitura pública restrita a colunas via view (abaixo)
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ads: leitura pública apenas de anúncios visíveis; dono gerencia o seu
create policy "ads_public_read_visible" on public.ads
  for select using (
    status = 'active' and public.has_active_subscription(profile_id)
  );
create policy "ads_owner_read" on public.ads
  for select using (auth.uid() = profile_id);
create policy "ads_owner_write" on public.ads
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ad_media/stories: leitura pública se o anúncio pai é visível; dono gerencia
create policy "ad_media_public_read" on public.ad_media
  for select using ( public.is_ad_visible(ad_id) );
create policy "ad_media_owner_write" on public.ad_media
  for all using (exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid()))
  with check (exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid()));

create policy "stories_public_read" on public.stories
  for select using ( expires_at > now() and public.is_ad_visible(ad_id) );
create policy "stories_owner_write" on public.stories
  for all using (exists (select 1 from public.ads a where a.id = stories.ad_id and a.profile_id = auth.uid()))
  with check (exists (select 1 from public.ads a where a.id = stories.ad_id and a.profile_id = auth.uid()));

-- subscriptions: dono lê; escrita só service role (sem policy de insert/update p/ anon/auth)
create policy "subscriptions_owner_read" on public.subscriptions
  for select using (auth.uid() = profile_id);

-- Trigger: cria profile ao criar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== 0002_users_interactions =====
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

-- ===== 0003_reviews_reports =====
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

-- ===== seed/plans =====
insert into public.plans (slug, name, price_cents, bump_cooldown_minutes, allows_story, max_photos, max_videos)
values
  ('basico','Básico',3990,60,false,6,1),
  ('pro','Pro',6990,15,true,12,3),
  ('premium','Premium',9990,0,true,12,3)
on conflict (slug) do update set
  name=excluded.name, price_cents=excluded.price_cents,
  bump_cooldown_minutes=excluded.bump_cooldown_minutes,
  allows_story=excluded.allows_story, max_photos=excluded.max_photos, max_videos=excluded.max_videos;

-- ===== seed/cities =====
insert into public.cities (name, uf, lat, lng) values
  ('São Paulo','SP',-23.5505,-46.6333),
  ('Guarulhos','SP',-23.4543,-46.5337),
  ('Osasco','SP',-23.5329,-46.7916),
  ('Campinas','SP',-22.9099,-47.0626),
  ('Santo André','SP',-23.6639,-46.5383),
  ('Rio de Janeiro','RJ',-22.9068,-43.1729),
  ('Niterói','RJ',-22.8832,-43.1034),
  ('Belo Horizonte','MG',-19.9167,-43.9345),
  ('Curitiba','PR',-25.4284,-49.2733),
  ('Porto Alegre','RS',-30.0346,-51.2177)
on conflict do nothing;
