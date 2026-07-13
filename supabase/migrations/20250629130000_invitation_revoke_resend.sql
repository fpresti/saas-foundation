-- Revoke (delete) and resend pending invitations.

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select i.tenant_id
  into v_tenant_id
  from public.invitations i
  where i.id = p_invitation_id
    and i.accepted_at is null
    and i.expires_at > now();

  if v_tenant_id is null then
    raise exception 'Invitation not found or no longer pending';
  end if;

  if not (
    public.is_super_admin()
    or public.has_permission(v_tenant_id, 'tenant.members.invite')
  ) then
    raise exception 'Not allowed';
  end if;

  delete from public.invitations
  where id = p_invitation_id
    and tenant_id = v_tenant_id
    and accepted_at is null;
end;
$$;

create or replace function public.resend_invitation(p_invitation_id uuid)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  email text,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_inv public.invitations%rowtype;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_inv
  from public.invitations i
  where i.id = p_invitation_id
    and i.accepted_at is null;

  if v_inv.id is null then
    raise exception 'Invitation not found or already accepted';
  end if;

  if not (
    public.is_super_admin()
    or public.has_permission(v_inv.tenant_id, 'tenant.members.invite')
  ) then
    raise exception 'Not allowed';
  end if;

  v_token := public.generate_token();
  v_expires_at := now() + interval '72 hours';

  update public.invitations i
  set token_hash = public.hash_token(v_token),
      expires_at = v_expires_at,
      sent_at = now(),
      updated_at = now()
  where i.id = v_inv.id;

  invitation_id := v_inv.id;
  tenant_id := v_inv.tenant_id;
  email := v_inv.email;
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

revoke execute on function public.revoke_invitation(uuid) from anon;
revoke execute on function public.resend_invitation(uuid) from anon;
