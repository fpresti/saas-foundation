# SaaS Foundation

Base multi-tenant para construir productos SaaS: **Angular 21** + **Supabase** (Auth, Postgres, RLS, RPC, Edge Functions) + **Stripe** (suscripciones del producto).

No es un SaaS de dominio (facturación, comunidades, etc.): es el **chasis** (auth, tenants, miembros, roles, planes/features, billing). Clona este repo y añade el dominio de tu producto encima.

## Qué incluye

| Área | Qué hay |
|------|---------|
| Auth | Login (password / magic link), sign-up, forgot/reset password |
| Tenants | Crear organización, selector multi-tenant, onboarding de perfil |
| Members | Invitar, aceptar invitación, desactivar, asignar roles |
| RBAC | Roles por tenant ∩ features del plan (`has_permission`) |
| Platform | Super-admin: CRUD features, plans, permissions |
| Billing | Stripe Checkout + Customer Portal + webhooks → `subscriptions` |
| Shell | Sidebar, navegación con gates por permiso |

Modelo de acceso (resumen):

```text
puede hacer X = (permiso vía rol) ∩ (feature en el plan del tenant)
```

Detalles: [`docs/ROLES.md`](./docs/ROLES.md), [`docs/BILLING.md`](./docs/BILLING.md).

## Stack

- Node.js 22+, npm
- Angular 21 (standalone, signals, OnPush)
- Tailwind CSS v4
- Supabase (hosted project)
- Stripe (modo test o live)
- Resend (emails de invitación)

## Arranque rápido (app local)

```bash
npm install
npm start
```

Abre `http://localhost:4200/`.

Configura el cliente en:

- `src/environments/environment.ts` (dev)
- `src/environments/environment.prod.ts` (prod)

Necesitas `supabaseUrl` + `supabaseAnonKey` del proyecto Supabase (Dashboard → Project Settings → API).

---

## 1. Supabase (proyecto y base de datos)

### Crear / enlazar proyecto

1. Crea un proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Instala y autentica la CLI:

```bash
npx supabase login
npx supabase link --project-ref <TU_PROJECT_REF>
```

El `project_ref` está en la URL del dashboard (`https://supabase.com/dashboard/project/<ref>`).

### Migraciones

Las migraciones viven en `supabase/migrations/`. Empujan el schema (tenants, members, roles, features/plans, billing, RLS, RPCs).

```bash
# Aplicar migraciones al proyecto enlazado
npx supabase db push

# Regenerar tipos TypeScript tras cambios de schema
npm run supabase:types
```

`npm run supabase:types` escribe en `src/types/supabase.ts` (el script del `package.json` usa un `project-id`; ajústalo al tuyo si clonas el repo).

### Auth (URLs de redirección)

En Supabase → Authentication → URL Configuration:

| Setting | Valor típico (local) |
|---------|----------------------|
| Site URL | `http://localhost:4200` |
| Redirect URLs | `http://localhost:4200/**` |

Añade las URLs de producción cuando despliegues (p. ej. `https://tu-dominio.com/**`).

Necesario para magic link, reset password y flujos post-auth.

### Service role

La **service role key** solo para scripts/Edge Functions (nunca en el frontend).  
Verify scripts opcionales: `SUPABASE_SERVICE_ROLE_KEY` en `.env.test.local`.

---

## 2. Edge Functions

Funciones en `supabase/functions/`:

| Función | Uso |
|---------|-----|
| `invite-member` | Crea invitación + envía email |
| `resend-invitation` | Reenvía email de invitación pendiente |
| `create-checkout-session` | Stripe Checkout (owner / super-admin) |
| `create-portal-session` | Stripe Customer Portal |
| `stripe-webhook` | Sincroniza suscripción/facturas Stripe → DB |

Despliegue (proyecto enlazado):

```bash
npx supabase functions deploy invite-member
npx supabase functions deploy resend-invitation
npx supabase functions deploy create-checkout-session
npx supabase functions deploy create-portal-session
npx supabase functions deploy stripe-webhook
```

`stripe-webhook` tiene `verify_jwt = false` en `supabase/config.toml` (Stripe firma el body).

Supabase inyecta automáticamente: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Emails (Resend + invitaciones)

Las invitaciones las envían `invite-member` / `resend-invitation` vía [Resend](https://resend.com/).

### Secrets (Dashboard → Edge Functions → Secrets, o CLI)

| Secret | Obligatorio | Propósito |
|--------|-------------|-----------|
| `RESEND_API_KEY` | Para enviar de verdad | API key de Resend |
| `APP_URL` | Sí (links correctos) | Base de la app, p. ej. `http://localhost:4200` |
| `INVITE_FROM_EMAIL` | Recomendado | Remitente verificado en Resend |

```bash
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase secrets set APP_URL=http://localhost:4200
npx supabase secrets set INVITE_FROM_EMAIL=noreply@tu-dominio.com
```

Si `RESEND_API_KEY` no está configurada, la invitación se crea igual y la URL de aceptación se escribe en los **logs** de la función (útil en dev).

Verifica el dominio (o usa el dominio de prueba de Resend) antes de enviar a emails reales.

---

## 4. Stripe (billing del producto)

Billing cuelga de la **suscripción del tenant** (planes free/premium/…), no de facturas a clientes finales del dominio.

Documentación completa: [`docs/BILLING.md`](./docs/BILLING.md).  
Checklist manual: [`docs/TEST_CHECKLIST.md`](./docs/TEST_CHECKLIST.md).

### Secrets

| Secret | Propósito |
|--------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_…` o `sk_live_…` |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | `whsec_…` del endpoint / Stripe CLI |

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
npx supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxx
```

### Una vez en Stripe Dashboard (test)

1. Crea un Producto + Price recurrente → copia `price_…`.
2. En la app, entra como **super_admin** → **Features & Plans** → edita el plan (p. ej. `premium`) → pega `provider_price_id`.
3. Configura webhook apuntando a:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

Eventos útiles: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`.

### Local con Stripe CLI

```bash
stripe listen --forward-to https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

Copia el `whsec_…` temporal al secret `STRIPE_WEBHOOK_SIGNING_SECRET` mientras desarrollas.

Planes **sin** `provider_price_id` siguen usando el RPC `change_tenant_plan` (entitlement manual, sin Checkout).

---

## 5. Super-admin y primer tenant

1. Regístrate / inicia sesión en la app.
2. Completa onboarding (perfil + crear tenant) → quedas como **owner**.
3. Para ser **super_admin** (catálogo global de features/plans/permissions), inserta tu `user_id` en `public.super_admins` (SQL Editor en Supabase), p. ej.:

```sql
insert into public.super_admins (user_id)
values ('<uuid-de-auth.users>');
```

Sin fila en `super_admins` no verás **Features & Plans** ni podrás editar el catálogo de permissions.

---

## 6. Scripts de verificación

Smoke tests contra el proyecto Supabase (requieren `.env.test.local`):

```bash
cp .env.test.local.example .env.test.local
# Rellena SUPABASE_URL + SUPABASE_ANON_KEY (y opcional SERVICE_ROLE_KEY)

npm run verify:seed-users   # crea usuarios de prueba y escribe credenciales
npm run verify:setup
npm run verify:all
```

| Script | Propósito |
|--------|-----------|
| `verify:db-sync` | Migraciones locales alineadas con remoto |
| `verify:setup` | Usuarios de test pueden entrar |
| `verify:tenant-onboarding` | Crear tenant E2E |
| `verify:invitations` | Invitar + aceptar |
| `verify:members-permissions` | Códigos de permiso alineados |
| `verify:roles-read` | Roles legibles |
| `verify:authz-gates` | Matriz `has_permission` / plan |
| `verify:billing-schema` | Schema de billing |
| `verify:tenant-settings` | Perfil de tenant legible |

---

## 7. Build, test y nuevas features

```bash
npm run build
npm test
```

Nueva feature (scaffold):

```bash
npm run feature:new my-feature
```

Enlaza la ruta lazy en `src/app/app.routes.ts`. Contrato de features: [`docs/FEATURES.md`](./docs/FEATURES.md).  
Reglas de arquitectura para agentes/devs: [`AI_PLAYBOOK.md`](./AI_PLAYBOOK.md).

---

## Checklist “proyecto nuevo desde este repo”

1. [ ] Clonar / copiar el repo
2. [ ] Crear proyecto Supabase y poner URL + anon key en `environment*.ts`
3. [ ] `supabase link` + `db push` + `npm run supabase:types` (ajustar project id si hace falta)
4. [ ] Configurar Auth redirect URLs
5. [ ] Desplegar Edge Functions
6. [ ] Secrets: Resend (`RESEND_*`, `APP_URL`) + Stripe (`STRIPE_*`)
7. [ ] Crear primer usuario + tenant; marcar super_admin
8. [ ] (Opcional) Producto/precio Stripe + `provider_price_id` en plan premium
9. [ ] `npm start` y smoke manual o `npm run verify:all`

---

## Docs

| Doc | Contenido |
|-----|-----------|
| [`AI_PLAYBOOK.md`](./AI_PLAYBOOK.md) | Arquitectura y reglas no negociables |
| [`docs/FEATURES.md`](./docs/FEATURES.md) | Patrón de features |
| [`docs/ROLES.md`](./docs/ROLES.md) | Memberships, roles, permissions, entitlement |
| [`docs/BILLING.md`](./docs/BILLING.md) | Stripe, webhooks, portal |
| [`docs/TEST_CHECKLIST.md`](./docs/TEST_CHECKLIST.md) | Checklist manual Plans / RBAC / Billing |
