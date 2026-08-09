-- Capa
alter table public.ad_media
  add column if not exists is_cover boolean not null default false;
create index if not exists ad_media_cover_idx on public.ad_media (ad_id) where is_cover;

-- Bucket público com teto de 150 MB e MIME allowlist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-media', 'ad-media', true, 157286400,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS (storage.objects já tem RLS habilitado no Supabase)
create policy "admedia_public_read" on storage.objects
  for select using (bucket_id = 'ad-media');
create policy "admedia_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'ad-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "admedia_owner_update" on storage.objects
  for update using (
    bucket_id = 'ad-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "admedia_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'ad-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
