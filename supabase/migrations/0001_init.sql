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

-- Leitura pública de plans e cities
create policy "plans_public_read" on public.plans for select using (true);
create policy "cities_public_read" on public.cities for select using (true);

-- profiles: dono lê/edita o seu; leitura pública restrita a colunas via view (abaixo)
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ads: leitura pública apenas de anúncios visíveis; dono gerencia o seu
create policy "ads_public_read_visible" on public.ads
  for select using (
    status = 'active'
    and exists (
      select 1 from public.subscriptions s
      where s.profile_id = ads.profile_id
        and s.status = 'active'
        and s.current_period_end > now()
    )
  );
create policy "ads_owner_read" on public.ads
  for select using (auth.uid() = profile_id);
create policy "ads_owner_write" on public.ads
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ad_media/stories: leitura pública se o anúncio pai é visível; dono gerencia
create policy "ad_media_public_read" on public.ad_media
  for select using (
    exists (select 1 from public.ads a
      where a.id = ad_media.ad_id and a.status = 'active'
      and exists (select 1 from public.subscriptions s
        where s.profile_id = a.profile_id and s.status='active' and s.current_period_end > now()))
  );
create policy "ad_media_owner_write" on public.ad_media
  for all using (exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid()))
  with check (exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid()));

create policy "stories_public_read" on public.stories
  for select using (
    expires_at > now() and exists (select 1 from public.ads a
      where a.id = stories.ad_id and a.status='active'
      and exists (select 1 from public.subscriptions s
        where s.profile_id = a.profile_id and s.status='active' and s.current_period_end > now()))
  );
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
