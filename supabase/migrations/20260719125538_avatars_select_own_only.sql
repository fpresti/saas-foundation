-- Public bucket: public URLs do not need a broad SELECT policy.
-- Restrict SELECT to own folder (required for upsert).

drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "avatars_select_own" on storage.objects;

create policy "avatars_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
