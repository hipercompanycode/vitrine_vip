-- Endurece a escrita: o primeiro segmento do storage_path deve ser o uid do dono.
drop policy if exists "ad_media_owner_write" on public.ad_media;
create policy "ad_media_owner_write" on public.ad_media
  for all
  using (exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid()))
  with check (
    exists (select 1 from public.ads a where a.id = ad_media.ad_id and a.profile_id = auth.uid())
    and split_part(storage_path, '/', 1) = auth.uid()::text
  );

drop policy if exists "stories_owner_write" on public.stories;
create policy "stories_owner_write" on public.stories
  for all
  using (exists (select 1 from public.ads a where a.id = stories.ad_id and a.profile_id = auth.uid()))
  with check (
    exists (select 1 from public.ads a where a.id = stories.ad_id and a.profile_id = auth.uid())
    and split_part(storage_path, '/', 1) = auth.uid()::text
  );
