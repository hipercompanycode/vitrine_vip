-- Rede de segurança: anunciante VERIFICADO relata um cliente (por telefone) que
-- fez algo errado (golpe, agressão, desrespeito). Vai pra MODERAÇÃO (admin) e,
-- se aprovado, vira alerta consultável por outras verificadas — SEM expor foto
-- nem quem relatou (foto/detalhes só admin). Não é público, não indexa.

create table if not exists public.client_reports (
  id uuid primary key default gen_random_uuid(),
  phone text not null,                    -- só dígitos (normalizado), chave da consulta
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,                 -- golpe / agressao / desrespeito / outro
  description text not null,
  photo_path text,                        -- bucket privado, SÓ admin vê
  status text not null default 'pending', -- pending / approved / rejected
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists client_reports_phone_idx on public.client_reports (phone);
create index if not exists client_reports_status_idx on public.client_reports (status);

-- RLS ligada e SEM policies de propósito: nada de acesso direto do cliente.
-- Todo acesso passa por rotas no servidor (service-role) que checam se quem
-- relata/consulta é anunciante verificado e filtram os campos sensíveis.
alter table public.client_reports enable row level security;

-- Bucket PRIVADO da foto do cliente relatado (só admin lê, via service-role).
insert into storage.buckets (id, name, public) values ('client-reports', 'client-reports', false)
on conflict (id) do nothing;

-- Anunciante autenticado só mexe na própria pasta {uid}/... ; leitura pública NÃO.
drop policy if exists "client_reports_obj_owner" on storage.objects;
create policy "client_reports_obj_owner" on storage.objects
  for all to authenticated
  using (bucket_id = 'client-reports' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'client-reports' and split_part(name, '/', 1) = auth.uid()::text);
