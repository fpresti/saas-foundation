# Billing (phase 2)

Billing hangs off **Subscription**, not Plan:

`Tenant → Subscription → (Plan → Features)` + `Subscription → Provider customer / invoices`

Phase 1 entitlement (`has_permission`, `change_tenant_plan`) stays valid. Provider sync lands in #50; portal UI in #51.

## Schema (#49)

### `subscriptions` (extended)

| Column | Purpose |
|--------|---------|
| `billing_customer_id` | Provider customer id (`cus_…`) |
| `provider_subscription_id` | Provider subscription id (`sub_…`) |
| `provider` | Currently `stripe` or null (entitlement-only) |
| `canceled_at` | Cancel timestamp from provider |
| `status` | Existing: `trialing` \| `active` \| `past_due` \| `canceled` |
| `current_period_end` | Existing; filled by webhooks later |

Provider billing columns are **not** writable by tenant owners (trigger `subscriptions_guard_billing_columns`). Updates come from **service_role** / webhooks or `is_super_admin()`.

### `plans.provider_price_id`

Optional Stripe (or other) price id for checkout mapping. Free/manual plans stay null.

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

## Entitlement interaction

`has_permission` already requires subscription `status in ('active','trialing')` for non-owners. Once webhooks set `past_due` / `canceled`, feature access drops for members; owners still bypass (#38).

## Next

- **#50** — Stripe checkout + signed webhooks → status / period / invoices (idempotent).
- **#51** — Settings: status, period, Customer Portal CTA (owner only).

## Verify

```bash
npm run verify:billing-schema
```
