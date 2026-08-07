# Billing (phase 2)

Billing hangs off **Subscription**, not Plan:

`Tenant → Subscription → (Plan → Features)` + `Subscription → Provider customer / invoices`

Phase 1 entitlement (`has_permission`, `change_tenant_plan`) stays valid for **free/manual** plans. Paid plans go through Stripe Checkout; webhooks sync status.

## Schema (#49)

### `subscriptions` (extended)

| Column | Purpose |
|--------|---------|
| `billing_customer_id` | Provider customer id (`cus_…`) |
| `provider_subscription_id` | Provider subscription id (`sub_…`) |
| `provider` | Currently `stripe` or null (entitlement-only) |
| `canceled_at` | Cancel timestamp from provider |
| `status` | Existing: `trialing` \| `active` \| `past_due` \| `canceled` |
| `current_period_end` | Filled by Stripe webhooks |

Provider billing columns are **not** writable by tenant owners (trigger `subscriptions_guard_billing_columns`). Updates come from **service_role** / webhooks or `is_super_admin()`.

### `plans.provider_price_id`

Stripe Price id (`price_…`) for Checkout. Free/manual plans stay null → keep using RPC `change_tenant_plan`.

### `invoices`

| Column | Notes |
|--------|-------|
| `tenant_id` | FK → `subscriptions.tenant_id` |
| `provider` / `provider_invoice_id` | Unique when set |
| `amount_cents`, `currency` | |
| `status` | `draft` \| `open` \| `paid` \| `void` \| `uncollectible` |
| `period_start` / `period_end` | |
| `hosted_invoice_url` / `invoice_pdf_url` | |

**RLS:** `SELECT` for tenant **owner** or super_admin. No authenticated write policies (service_role only).

### `billing_webhook_events` (#50)

Idempotency log `(provider, event_id)`. Service role only.

## Stripe integration (#50)

### Edge Functions

| Function | Auth | Role |
|----------|------|------|
| `stripe-webhook` | Stripe signature (`verify_jwt = false`) | Sync subscription + invoices |
| `create-checkout-session` | User JWT; owner/SA | Checkout for plans with `provider_price_id` |
| `create-portal-session` | User JWT; owner/SA | Stripe Customer Portal URL (#51 UI) |

### Secrets (Dashboard → Edge Functions → Secrets)

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided by the platform.

### Event → DB mapping

| Stripe event | Effect |
|--------------|--------|
| `checkout.session.completed` | Link `billing_customer_id` / `provider_subscription_id`, set `plan_id` |
| `customer.subscription.*` | `status`, `current_period_end`, `canceled_at`, plan via price |
| `invoice.*` | Upsert `invoices` row |

Status map: `active`/`trialing` passthrough; `past_due`/`unpaid`/`incomplete*` → `past_due`; `canceled` → `canceled`.

### Local test (Stripe CLI)

1. Set secrets on the project (or `supabase secrets set ...` when linked).
2. Deploy functions (`stripe-webhook`, `create-checkout-session`, `create-portal-session`).
3. Forward webhooks:

```bash
stripe listen --forward-to https://ynwlidadbattxknclxyd.supabase.co/functions/v1/stripe-webhook
```

4. Copy the CLI `whsec_…` into `STRIPE_WEBHOOK_SIGNING_SECRET` (for local forward).
5. Trigger a test event:

```bash
stripe trigger checkout.session.completed
```

6. Confirm:
   - Invalid signature → HTTP 400
   - Valid event → row in `billing_webhook_events`; subscription/invoice updated when metadata/`cus_` matches a tenant
7. For a real checkout: set `plans.provider_price_id` for `premium`, invoke `create-checkout-session` as owner with `successUrl`/`cancelUrl`.

### App usage

```ts
await supabase.functions.invoke('create-checkout-session', {
  body: { tenantId, planId, successUrl, cancelUrl },
});
await supabase.functions.invoke('create-portal-session', {
  body: { tenantId, returnUrl },
});
```

Super_admin sets `plans.provider_price_id` in **Features & Plans** (plan editor).  
Plans **without** `provider_price_id` still use `change_tenant_plan` (entitlement-only).

Full manual checklist: [`docs/TEST_CHECKLIST.md`](./TEST_CHECKLIST.md).

## Entitlement interaction

`has_permission` requires subscription `status in ('active','trialing')` for non-owners. Webhooks setting `past_due` / `canceled` drop feature access for members; owners still bypass (#38).

## Next

- ~~**#50** — Stripe checkout + signed webhooks~~ (edge functions + secrets)
- ~~**#51** — Settings: status, period, Portal CTA~~ (owner only)

## Settings UI (#51)

Owner on `/settings`:
- Sees plan, status, `current_period_end`, provider
- Warnings for `past_due` / `canceled`
- **Save plan**: free/manual → `change_tenant_plan`; plan with `provider_price_id` → Stripe Checkout
- **Manage billing**: Customer Portal (only if `billing_customer_id` exists)

Non-owners with `settings.read` can view tenant/subscription status but not change plan or open portal.

## Verify

```bash
npm run verify:billing-schema
```
