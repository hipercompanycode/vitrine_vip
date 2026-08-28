-- Data de nascimento no perfil (autodeclarada).
-- Gate: menor de 18 (ou sem data) não pode anunciar e não vê as fotos de nudez
-- nítidas — nem logado (a verificação por documento fica pro fluxo do anúncio).
alter table public.profiles add column if not exists birthdate date;

-- O trigger de novo usuário passa a copiar a data de nascimento vinda do signup
-- (raw_user_meta_data->>'birthdate', formato 'YYYY-MM-DD').
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  wanted text := new.raw_user_meta_data->>'role';
  bd text := new.raw_user_meta_data->>'birthdate';
begin
  insert into public.profiles (id, role, birthdate)
  values (
    new.id,
    case when wanted in ('anunciante','comum') then wanted else 'comum' end,
    case when bd ~ '^\d{4}-\d{2}-\d{2}$' then bd::date else null end
  )
  on conflict (id) do nothing;
  return new;
end; $$;
