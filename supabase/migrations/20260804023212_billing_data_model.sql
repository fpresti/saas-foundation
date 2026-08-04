-- #49: Billing data model hanging off subscriptions (no provider integration yet).
-- Writes to invoices + billing provider columns are service_role / super_admin only.

-- ---------------------------------------------------------------------------
-- plans: optional provider price mapping (used by Stripe checkout in #50)
-- ---------------------------------------------------------------------------
alter table public.plans
  add column if not exists provider_price_id text;

comment on column public.plans.provider_price_id is
  'Provider price/plan id (e.g. Stripe price_…). Null for free/manual plans.';

create unique index if not exists plans_provider_price_id_uidx
  on public.plans (provider_price_id)
  where provider_price_id is not null;

-- ---------------------------------------------------------------------------
-- subscriptions: provider customer + subscription linkage
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists provider text,
  add column if not exists billing_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists canceled_at timestamptz;

comment on column public.subscriptions.provider is
  'Billing provider key when linked (e.g. stripe). Null = entitlement-only / unpaid.';
comment on column public.subscriptions.billing_customer_id is
  'Provider customer id (e.g. Stripe cus_…).';
comment on column public.subscriptions.provider_subscription_id is
  'Provider subscription id (e.g. Stripe sub_…).';
comment on column public.subscriptions.canceled_at is
  'When the subscription was canceled at the provider (if applicable).';

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider is null or provider in ('stripe'));

create unique index if not exists subscriptions_billing_customer_uidx
  on public.subscriptions (provider, billing_customer_id)
  where billing_customer_id is not null;

create unique index if not exists subscriptions_provider_subscription_uidx
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

-- Guard: authenticated owners may change plan/status via RPC, but not provider billing ids.
create or replace function public.subscriptions_guard_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if (
      new.provider is distinct from old.provider
      or new.billing_customer_id is distinct from old.billing_customer_id
      or new.provider_subscription_id is distinct from old.provider_subscription_id
      or new.canceled_at is distinct from old.canceled_at
    )
      and not public.is_super_admin()
      and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
    then
      raise exception 'Billing provider fields are managed by billing webhooks/service role';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_guard_billing_columns on public.subscriptions;
create trigger subscriptions_guard_billing_columns
  before update on public.subscriptions
  for each row
  execute function public.subscriptions_guard_billing_columns();

-- ---------------------------------------------------------------------------
-- invoices: history linked to tenant subscription (1:1 via tenant_id)
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null
    references public.subscriptions (tenant_id) on delete cascade,
  provider text,
  provider_invoice_id text,
  amount_cents integer not null default 0
    check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  period_start timestamptz,
  period_end timestamptz,
  hosted_invoice_url text,
  invoice_pdf_url text,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_provider_check
    check (provider is null or provider in ('stripe'))
);

comment on table public.invoices is
  'Provider invoices for a tenant subscription. Written by webhooks/service role (#50).';

create unique index if not exists invoices_provider_invoice_uidx
  on public.invoices (provider, provider_invoice_id)
  where provider_invoice_id is not null;

create index if not exists invoices_tenant_id_created_at_idx
  on public.invoices (tenant_id, created_at desc);

create or replace function public.invoices_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row
  execute function public.invoices_set_updated_at();

alter table public.invoices enable row level security;

-- Owner (and super_admin) can read; members of other tenants cannot.
-- No insert/update/delete policies for authenticated → service_role only writes.
drop policy if exists invoices_select on public.invoices;
create policy invoices_select
  on public.invoices
  for select
  to authenticated
  using (
    public.is_super_admin()
    or public.is_tenant_owner(tenant_id)
  );

revoke all on table public.invoices from public;
revoke all on table public.invoices from anon;
grant select on table public.invoices to authenticated;
grant all on table public.invoices to service_role;
