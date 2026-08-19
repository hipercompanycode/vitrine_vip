-- Comprovação anti-fake: documento com foto + vídeo de verificação (PRIVADO, só admin).
create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  doc_path text,
  video_path text,
  status text not null default 'pending',  -- pending / approved / rejected
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists verifications_profile_uniq on public.verifications (profile_id);

alter table public.verifications enable row level security;
-- dono gerencia a própria linha
drop policy if exists "verif_owner" on public.verifications;
create policy "verif_owner" on public.verifications
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- bucket PRIVADO (não público) p/ os arquivos sensíveis
insert into storage.buckets (id, name, public) values ('verifications', 'verifications', false)
on conflict (id) do nothing;

-- upload/gestão só na própria pasta {uid}/... ; leitura pública NÃO (bucket privado; admin lê via service-role)
drop policy if exists "verif_obj_owner" on storage.objects;
create policy "verif_obj_owner" on storage.objects
  for all to authenticated
  using (bucket_id = 'verifications' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'verifications' and split_part(name, '/', 1) = auth.uid()::text);
