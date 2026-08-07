-- Re-invite after expiry: expired rows (accepted_at IS NULL) blocked uq_invitations_pending.
-- Clean them up before creating a new invitation. Multi-tenant membership is unchanged.

create or replace function public.create_invitation(
  p_tenant_id uuid,
  p_email text,
  p_member_type text default 'member',
  p_expires_in_hours integer default 72
)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  email text,
  member_type text,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_inv_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_expires_in_hours is null or p_expires_in_hours <= 0 or p_expires_in_hours > 24 * 30 then
    raise exception 'Invalid expires_in_hours';
  end if;

  if not (
    public.is_super_admin()
    or public.has_permission(p_tenant_id, 'tenant.members.invite')
  ) then
    raise exception 'Not allowed';
  end if;

  if exists (
    select 1
    from public.tenant_members tm
    join auth.users u on u.id = tm.user_id
    where tm.tenant_id = p_tenant_id
      and lower(u.email) = lower(p_email)
  ) then
    raise exception 'User already belongs to this tenant';
  end if;

  delete from public.invitations i
  where i.tenant_id = p_tenant_id
    and lower(i.email) = lower(p_email)
    and i.accepted_at is null
    and i.expires_at <= now();

  if exists (
    select 1
    from public.invitations i
    where i.tenant_id = p_tenant_id
      and lower(i.email) = lower(p_email)
      and i.accepted_at is null
      and i.expires_at > now()
  ) then
    raise exception 'A pending invitation already exists for this email';
  end if;

  v_token := public.generate_token();
  v_token_hash := public.hash_token(v_token);
  v_expires_at := now() + make_interval(hours => p_expires_in_hours);

  insert into public.invitations (
    tenant_id,
    email,
    member_type,
    token_hash,
    expires_at,
    sent_at
  )
  values (
    p_tenant_id,
    lower(p_email),
    'member',
    v_token_hash,
    v_expires_at,
    now()
  )
  returning id into v_inv_id;

  invitation_id := v_inv_id;
  tenant_id := p_tenant_id;
  email := lower(p_email);
  member_type := 'member';
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;
