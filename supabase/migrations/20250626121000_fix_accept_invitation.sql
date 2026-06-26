-- Fix ambiguous tenant_id in accept_invitation return (output column vs PL/pgSQL variable).

create or replace function public.accept_invitation(p_token text)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  member_type text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
#variable_conflict use_column
declare
  v_hash text;
  v_inv public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_hash := public.hash_token(p_token);

  select *
  into v_inv
  from public.invitations i
  where i.token_hash = v_hash
    and i.accepted_at is null
    and i.expires_at > now()
  limit 1;

  if v_inv.id is null then
    raise exception 'Invalid or expired invitation';
  end if;

  insert into public.tenant_members as tm (tenant_id, user_id, member_type)
  values (v_inv.tenant_id, auth.uid(), v_inv.member_type)
  on conflict (tenant_id, user_id) do update
  set member_type = excluded.member_type,
      updated_at = now();

  update public.invitations i
  set accepted_at = now(),
      accepted_by = auth.uid(),
      updated_at = now()
  where i.id = v_inv.id;

  insert into public.profiles as p (user_id, last_tenant_id)
  values (auth.uid(), v_inv.tenant_id)
  on conflict (user_id) do update
  set last_tenant_id = excluded.last_tenant_id,
      updated_at = now();

  return query select v_inv.id, v_inv.tenant_id, v_inv.member_type;
end;
$$;
