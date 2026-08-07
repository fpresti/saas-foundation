-- #50: Idempotent Stripe (and future) webhook event log.

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe'
    check (provider in ('stripe')),
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb,
  unique (provider, event_id)
);

comment on table public.billing_webhook_events is
  'Idempotency log for billing provider webhooks. Written by service_role only.';

create index if not exists billing_webhook_events_processed_at_idx
  on public.billing_webhook_events (processed_at desc);

alter table public.billing_webhook_events enable row level security;

-- No policies for authenticated: service_role only (bypasses RLS).
revoke all on table public.billing_webhook_events from public;
revoke all on table public.billing_webhook_events from anon;
revoke all on table public.billing_webhook_events from authenticated;
grant all on table public.billing_webhook_events to service_role;
