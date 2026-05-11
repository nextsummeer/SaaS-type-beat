-- Buckets privados
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audios', 'audios', false, 104857600, array['audio/mpeg','audio/wav','audio/flac','audio/mp4','audio/x-m4a']),
  ('covers', 'covers', false, 5242880,   array['image/jpeg','image/png']),
  ('videos', 'videos', false, 524288000, array['video/mp4']);

-- Policies: path comeca com {user_id}/
create policy "audios_own" on storage.objects
  for all using (
    bucket_id = 'audios' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  ) with check (
    bucket_id = 'audios' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy "covers_own" on storage.objects
  for all using (
    bucket_id = 'covers' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  ) with check (
    bucket_id = 'covers' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy "videos_own" on storage.objects
  for all using (
    bucket_id = 'videos' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  ) with check (
    bucket_id = 'videos' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );
