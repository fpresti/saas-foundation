# Feature Pattern — SaaS Foundation

This document explains how to create a new feature in saas-foundation so every feature follows the same structure and aligns with [AI_PLAYBOOK.md](../AI_PLAYBOOK.md).

---

## 1. Folder rules: core vs shared vs features

| Folder       | Purpose |
|-------------|---------|
| **core/**   | Cross-cutting concerns only: auth, guards, supabase client, tenant, app shell, shared utils. No business domain logic. |
| **shared/** | Reusable, non-core UI and types: data-table, buttons, pipes, shared types. No feature-specific logic. |
| **features/** | Self-contained domain logic. One folder per feature. Each feature has its own pages, components, services, stores, and types. |

- **Core**: Single source for Supabase client, auth, tenant context. Features depend on core; core does not depend on features.
- **Shared**: Used by core and features. No dependency on a specific feature.
- **Features**: Depend on core (and optionally shared). Isolated from other features when possible.

---

## 2. Naming conventions

- **Feature folder**: `kebab-case` (e.g. `tenant-select`, `onboarding-create-tenant`).
- **Files**: `kebab-case` with descriptive suffix (e.g. `tenant-select.component.ts`, `my-feature.page.ts`).
- **Classes / types**: `PascalCase` (e.g. `TenantSelectComponent`, `MyFeatureStore`, `MyFeatureItem`).
- **Signals / methods**: `camelCase` (e.g. `isLoading`, `load()`).
- **Selectors**: `app-<feature>-<suffix>` (e.g. `app-tenant-select`, `app-my-feature-page`).

Placeholder convention in templates:
- `__feature__` → kebab-case feature name (e.g. `my-feature`).
- `__Feature__` → PascalCase feature name (e.g. `MyFeature`).
- `__featureCamel__` → camelCase feature name for TS identifiers (e.g. `myFeature`); used in route export names and private service field names.

---

## 3. How to create a new feature

### Option A: Copy the template by hand

1. Copy the entire folder:
   ```
   docs/templates/feature/   →   src/app/features/<feature-name>/
   ```
2. Rename every file and folder that contains `__feature__` to use your `<feature-name>` (kebab-case).
3. In every file, replace:
   - `__feature__` → your feature name in kebab-case (e.g. `my-feature`).
   - `__Feature__` → your feature name in PascalCase (e.g. `MyFeature`).
   - `__featureCamel__` → camelCase (e.g. `myFeature`) for route exports and service field names.
4. Fix the store import path to core if needed: from `../../core/utils/supabase-error.util` (relative to `stores/<name>.store.ts`).
5. Wire routing (see section 5).

### Option B: Use the scaffold script (recommended)

```bash
npm run feature:new my-feature
```

This creates `src/app/features/my-feature/` with the template structure and tokens already replaced. It does **not** modify `app.routes.ts`; you wire the lazy route yourself (see section 5).

---

## 4. Template structure (what you get)

```
features/<feature-name>/
  pages/
    <feature-name>.page.ts
    <feature-name>.page.html
  components/
    <feature-name>-card.component.ts
    <feature-name>-card.component.html
  services/
    <feature-name>.service.ts
  stores/
    <feature-name>.store.ts
  types.ts
  index.ts
  routes.ts
```

- **pages/**: Top-level page component(s) for the feature route. Standalone + OnPush, use store/service only.
- **components/**: Feature-specific presentational or container components. Standalone + OnPush, no direct Supabase.
- **services/**: All data access. Returns Promises. Uses Supabase/RPC; never used for permission logic.
- **stores/**: State (signals), computed selectors, async actions that call the service. Components consume the store.
- **types.ts**: Feature domain types (and DTOs if needed).
- **index.ts**: Re-exports store, service, types (and optionally routes) for clean imports.
- **routes.ts**: Lazy route definition for this feature (see section 5).

---

## 5. Wiring routing (lazy route)

Each feature can export a `routes.ts` that defines its routes. Example:

```ts
// features/my-feature/routes.ts
import { Routes } from '@angular/router';
import { MyFeaturePageComponent } from './pages/my-feature.page';

export const myFeatureRoutes: Routes = [
  { path: '', component: MyFeaturePageComponent },
];
```

In `app.routes.ts` (or under the app shell children), load the feature lazily:

```ts
{
  path: 'my-feature',
  loadChildren: () =>
    import('./features/my-feature/routes').then((m) => m.myFeatureRoutes),
}
```

- Prefer lazy loading for new features. Existing routes are not migrated unless trivial.
- Do not let the scaffold script modify `app.routes.ts`; wire the route manually to avoid accidental overwrites.

---

## 6. Store vs service responsibilities

| Layer      | Responsibility |
|-----------|-----------------|
| **Store** | Holds state (signals), computed selectors, and async actions. Calls the service. Manages `isLoading` and `error`. Components only read from the store and call store methods (e.g. `load()`). |
| **Service** | Talks to Supabase (or RPC). Returns Promises. No signals. Normalizes errors (e.g. via `normalizeError`) and throws normalized errors. Used only by the store (and tests). |

Data flow:

```
Component → Store → Service → Supabase / RPC
```

Forbidden:

```
Component → Supabase
```

---

## 7. Good vs forbidden patterns (from playbook)

### Good

- **Standalone + OnPush** for all components.
- **Signals** for state in stores; **computed** for derived state.
- **Promises** in services; store `async load()` calls service and sets signals.
- **No Supabase in components**: only store + service.
- **RPC for critical writes**: invitations, membership, subscription, role changes. Direct table access only for tenant-scoped reads or non-critical writes protected by RLS.
- **Normalized errors**: `{ code, message, details? }`; never expose raw Supabase errors to the UI.
- **Tailwind via CSS variables**: e.g. `bg-[var(--color-bg-primary)]`, `border-[var(--color-border-default)]`. No arbitrary text colors; respect global tokens.
- **Separate .html and .ts**; no inline templates unless explicitly requested.

### Forbidden

- **RxJS-based global state** (use signals).
- **Supabase calls inside components** (use store + service).
- **Permission logic in Angular** (backend/RLS is authoritative).
- **Bypassing RPC for critical writes** (invitations, membership, etc.).
- **New UI frameworks** without explicit request.
- **Setting text color classes** in components (use design tokens).
- **Overabstracting** in MVP (keep it simple).

---

## 8. Checklist for a new feature

- [ ] Feature folder created (template or script).
- [ ] All `__feature__` / `__Feature__` tokens replaced with your feature name.
- [ ] Store has `isLoading`, `error`, state signals, and an async `load()` that uses the service.
- [ ] Service returns Promises; no Supabase in components.
- [ ] Components are Standalone + OnPush with external templates.
- [ ] Route wired in `app.routes.ts` (lazy load if desired).
- [ ] Build passes; no forbidden patterns; RLS/RPC respected where applicable.
