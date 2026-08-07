# Checklist de test general — Plans / RBAC / Billing

Usá Genesis + app local (`ng serve`). Modo Stripe **Test**.

## 0) Prerrequisitos

- [ ] App corriendo y login owner + invitee + (ideal) super_admin
- [ ] Secrets Supabase: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`
- [ ] Webhook Stripe → `…/functions/v1/stripe-webhook` (destino Resumen activo)
- [ ] Migraciones billing aplicadas (ya en Genesis)
- [ ] Branch/PRs mergeados o checkouteados: fase 1 RBAC + billing

```bash
npm run verify:all
npm run verify:billing-schema
npm run verify:authz-gates
```

---

## 1) Stripe product (una vez)

- [ ] Stripe Test → Catálogo → Producto “Premium” + precio recurrente
- [ ] Copiar `price_…`
- [ ] App como **super_admin** → **Features & Plans** → Edit **premium** → pegar Stripe price id → Save
- [ ] En la tabla de plans, columna **Stripe price** muestra `price_…` (no `—`)

---

## 2) Entitlement / RBAC (fase 1)

### Owner
- [ ] Ve Members, Settings, Roles
- [ ] Settings: cambia plan **free ↔ premium** sin Stripe price en free (entitlement RPC)
- [ ] Members: invita usuario; asigna roles multi
- [ ] Roles: ve lista; **no** edita catálogo de permissions (solo SA)

### Collaborator (invitee)
- [ ] Ve Members (read) y Settings (read) si tiene permiso
- [ ] **No** asigna roles / **no** invita
- [ ] **No** ve Features & Plans
- [ ] **No** ve botones Change plan / Manage billing / Set up Stripe

### Tenant manager (si asignás ese rol)
- [ ] Entra a Members/Settings/Roles por permiso (sin ser owner)
- [ ] Puede `roles.assign` según seed

### Super admin
- [ ] Features & Plans: CRUD plans/features + plan↔features
- [ ] Roles: tabs Roles & Permissions / Permissions editables

---

## 3) Billing Checkout (fase 2)

- [ ] Owner en plan premium **con** `provider_price_id` y **sin** customer → aparece **Set up Stripe billing**
- [ ] Click → redirige a Checkout Stripe
- [ ] Pagar con `4242 4242 4242 4242`, fecha futura, CVC cualquiera
- [ ] Vuelve a `/settings?checkout=success`
- [ ] Settings muestra: provider `stripe`, period end (si webhook llegó), status `active`
- [ ] Aparece **Manage billing**
- [ ] Tabla `billing_webhook_events` tiene eventos recientes
- [ ] `subscriptions.billing_customer_id` / `provider_subscription_id` poblados

### Cambio a plan de pago distinto
- [ ] Owner elige otro plan con `price_…` → Save → Checkout (o actualización vía portal)

### Downgrade free
- [ ] Owner elige **free** → Save → plan local sin Checkout
- [ ] (Opcional) cancelar en Stripe Portal para no dejar sub huérfana

---

## 4) Portal y estados

- [ ] **Manage billing** abre Customer Portal (facturas / método de pago)
- [ ] Simular `past_due` / cancel en Stripe Test → webhook → Settings muestra warning
- [ ] Collaborator: `has_permission` niega features si status ∉ `active|trialing` (owner sigue bypass)

---

## 5) Seguridad rápida

- [ ] POST a webhook sin firma / firma mala → 400 (con secrets puestos)
- [ ] Owner **no** puede `update subscriptions.billing_customer_id` desde cliente
- [ ] Non-owner **no** ve filas de `invoices` de otro tenant

---

## 6) Regresión corta

- [ ] Login / select tenant / home
- [ ] Invite + accept → rol `collaborator`
- [ ] Profile / switch tenant (si SA multi-tenant)

---

## Problemas frecuentes

| Síntoma | Causa típica |
|---------|----------------|
| Save plan no abre Checkout | Falta `provider_price_id` o mismo plan sin setup CTA |
| 503 Checkout | Falta `STRIPE_SECRET_KEY` |
| Webhook misconfigured / 500 | Falta `STRIPE_WEBHOOK_SIGNING_SECRET` |
| Checkout OK pero Settings igual | Webhook no entregó / eventos sin `tenant_id` en metadata |
| Manage billing ausente | Aún no hay `billing_customer_id` |
