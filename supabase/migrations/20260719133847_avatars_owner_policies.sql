-- Owners may manage avatars of users who share a tenant they own.

drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "avatars_select_own" on storage.objects;
drop policy if exists "avatars_select_own_or_owner" on storage.objects;
drop policy if exists "avatars_insert_own_or_owner" on storage.objects;
drop policy if exists "avatars_update_own_or_owner" on storage.objects;
drop policy if exists "avatars_delete_own_or_owner" on storage.objects;

create policy "avatars_select_own_or_owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or exists (
        select 1
        from public.tenant_members tm_owner
        join public.tenant_members tm_target
          on tm_target.tenant_id = tm_owner.tenant_id
         and tm_target.user_id::text = (storage.foldername(name))[1]
        where tm_owner.user_id = (select auth.uid())
          and tm_owner.member_type = 'owner'
          and tm_owner.active = true
      )
    )
  );

create policy "avatars_insert_own_or_owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or exists (
        select 1
        from public.tenant_members tm_owner
        join public.tenant_members tm_target
          on tm_target.tenant_id = tm_owner.tenant_id
         and tm_target.user_id::text = (storage.foldername(name))[1]
        where tm_owner.user_id = (select auth.uid())
          and tm_owner.member_type = 'owner'
          and tm_owner.active = true
      )
    )
  );

create policy "avatars_update_own_or_owner"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or exists (
        select 1
        from public.tenant_members tm_owner
        join public.tenant_members tm_target
          on tm_target.tenant_id = tm_owner.tenant_id
         and tm_target.user_id::text = (storage.foldername(name))[1]
        where tm_owner.user_id = (select auth.uid())
          and tm_owner.member_type = 'owner'
          and tm_owner.active = true
      )
    )
  )
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or exists (
        select 1
        from public.tenant_members tm_owner
        join public.tenant_members tm_target
          on tm_target.tenant_id = tm_owner.tenant_id
         and tm_target.user_id::text = (storage.foldername(name))[1]
        where tm_owner.user_id = (select auth.uid())
          and tm_owner.member_type = 'owner'
          and tm_owner.active = true
      )
    )
  );

create policy "avatars_delete_own_or_owner"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or exists (
        select 1
        from public.tenant_members tm_owner
        join public.tenant_members tm_target
          on tm_target.tenant_id = tm_owner.tenant_id
         and tm_target.user_id::text = (storage.foldername(name))[1]
        where tm_owner.user_id = (select auth.uid())
          and tm_owner.member_type = 'owner'
          and tm_owner.active = true
      )
    )
  );
