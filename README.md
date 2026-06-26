# SaaS Foundation

Multi-tenant SaaS framework base: **Angular 21** + **Supabase** (Auth, RLS, RPC).

## Prerequisites

- Node.js 22+
- npm
- Supabase project ([dashboard](https://supabase.com/dashboard))

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:4200/`. Environment: `src/environments/environment.ts` (Supabase URL + anon key).

## Verification scripts

Smoke tests against Supabase dev (require `.env.test.local`):

```bash
cp .env.test.local.example .env.test.local
npm run verify:seed-users   # creates dev users + writes .env.test.local
npm run verify:setup
npm run verify:all
```

| Script | Purpose |
|--------|---------|
| `verify:db-sync` | Local migrations match remote |
| `verify:setup` | Test users can sign in |
| `verify:tenant-onboarding` | Create tenant E2E |
| `verify:invitations` | Invite + accept flow |
| `verify:members-permissions` | Permission codes aligned |
| `verify:roles-read` | Roles readable |
| `verify:tenant-settings` | Tenant profile readable |

## Database

Migrations: `supabase/migrations/`. Link CLI:

```bash
npx supabase login
npx supabase link --project-ref ynwlidadbattxknclxyd
npm run supabase:types
```

## Docs

- [AI_PLAYBOOK.md](./AI_PLAYBOOK.md) — architecture rules
- [docs/FEATURES.md](./docs/FEATURES.md) — feature scaffold pattern

## Build & test

```bash
npm run build
npm test
```

## New feature

```bash
npm run feature:new my-feature
```

Wire lazy route in `src/app/app.routes.ts` manually.
