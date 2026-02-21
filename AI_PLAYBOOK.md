# SaaS Foundation — AI Working Agreement (Framework v2)

This document defines how AI agents (Cursor / Codex) must operate in this repository.

If any instruction conflicts with this document, **this document wins**.

SaaS Foundation has evolved from MVP into a reusable SaaS framework base.  
All new work must respect the Feature Architecture Contract defined below.

---

# 0) Architecture Vision

SaaS Foundation is a **strict multi-tenant SaaS framework foundation**.

Core Scope:
- Supabase (Postgres + RLS + RPC + Auth)
- Angular 21 (Standalone + Signals)
- Tailwind CSS v4 (CSS variables only)
- Isolation enforced via RLS
- Backend is authoritative
- Application must not render protected features until:
  - Auth session is resolved
  - Tenant context is resolved

Future evolution:
- Optional backend intermediary layer
- Fine-grained permission system
- Reusable SaaS modules (CRM, billing, fleet, etc.)

This playbook must evolve before architecture evolves.

---

# 1) Core Non-Negotiable Principles

## 1.1 Backend is Authoritative

- Frontend never grants permissions.
- Frontend never assumes access.
- Security is enforced by RLS and/or RPC.
- UI visibility ≠ authorization.

## 1.2 Strict Multi-Tenant Isolation

- Every business entity belongs to a `tenant_id`.
- Every query must respect tenant context.
- Never implement client-side filtering for security.
- Never bypass RLS expectations.
- Tenant selection is contextual, not a security mechanism.

## 1.3 Controlled Evolution

- Prefer simple, readable patterns.
- No premature abstraction.
- No accidental framework growth.
- Framework decisions must be explicit.

---

# 2) Frontend Stack Rules

## 2.1 Angular Rules

- Angular 21.
- Standalone components only.
- `ChangeDetectionStrategy.OnPush` is mandatory.
- Signals for state management.
- Services return Promises.
- Avoid RxJS unless strictly necessary.
- If RxJS is used, justify it.

## 2.2 Component Discipline

Components must be thin.

- No Supabase calls inside components.
- No business logic inside templates.
- No router + service mixing for orchestration.
- Components consume Stores only.
- Inline templates are forbidden unless explicitly requested.
- Split components if > 300 lines.

## 2.3 Store Pattern (Signals)

Each feature store must include:

- `state` signal
- `isLoading` signal
- `error` signal
- computed selectors
- async actions (Promise-based)

Pattern:

Component → Store → Service → Supabase/RPC

Never:

Component → Supabase  
Component → Service directly (except trivial read-only cases)

---

# 3) Styling Rules (Tailwind v4 + CSS Variables)

Tailwind is configured via CSS variables only.

Rules:
- No `tailwind.config.js`.
- No explicit text color classes in components.
- Use tokens:
  - `bg-[var(--color-bg-primary)]`
  - `bg-[var(--color-bg-secondary)]`
  - `border-[var(--color-border-default)]`
- Use `rounded` only.
- Respect global button/input styles.
- No inline styles unless strictly required.
- No third-party UI frameworks.

Reusable UI must go into `shared/`.

---

# 4) Supabase Integration Rules

## 4.1 Single Client Source

- Supabase client is created once in `core/supabase`.
- No duplicate instances.
- No Supabase usage outside Services.

## 4.2 RPC-First for Critical Writes

RPC required for:
- Tenant creation
- Owner assignment
- Invitations
- Membership changes
- Role changes
- Subscription changes
- Any security-sensitive operation

Direct table operations allowed only for:
- Tenant-scoped non-critical entities
- Read-only queries protected by RLS

If unsure → use RPC.

## 4.3 Error Normalization

All Supabase errors must be normalized:

{
  code: string
  message: string
  details?: unknown
}

Never expose raw Supabase error objects to UI.

---

# 5) Roles Model (Current Phase)

Platform Role:
- super_admin

Tenant Roles:
- owner
- member

Frontend may:
- Show/hide UI elements cosmetically.

Frontend must not:
- Enforce security
- Filter data for security
- Implement permission engines

Future permissions system must be defined before implementation.

---

# 6) Folder Structure

src/
  app/
    core/
      auth/
      guards/
      supabase/
      tenant/
      ui/
      utils/

    features/
      <feature-name>/
        pages/
        components/
        services/
        stores/
        types.ts
        routes.ts
        index.ts

    shared/
      components/
      ui/
      types/

    app.routes.ts

Core:
Cross-cutting concerns only.

Features:
Self-contained domain logic.

Shared:
Reusable UI primitives only.

---

# 7) Feature Architecture Contract (Framework Layer)

Every feature must follow this structure:

features/<feature-name>/
  pages/
  components/
  services/
  stores/
  types.ts
  routes.ts
  index.ts

Rules:

- Page component is the entry point.
- Store orchestrates feature state.
- Service handles data access.
- Supabase is only used inside Service.
- No cross-feature coupling.
- Features must be lazy-load ready.
- Reusable UI belongs in `shared/`, not inside features.

---

# 8) Shared Component Rules

Shared components:

- Must not depend on feature logic.
- Must not inject feature stores.
- Must not call router.
- Must be generic and typed.
- Must use OnPush.
- Must be mobile-first responsive.

---

# 9) Ticket-Based AI Workflow

AI must operate in structured tickets.

Each ticket must define:
- Goal
- Scope
- Files to modify
- Files not to touch
- Acceptance criteria
- Out of scope

AI must:
- Modify only required files.
- Avoid sweeping refactors.
- Avoid new dependencies unless requested.
- Respect Feature Architecture Contract.

---

# 10) Definition of Done

A feature is done when:

- Build passes.
- No forbidden patterns introduced.
- RLS/RPC respected.
- No fake authorization.
- No Supabase in components.
- Store → Service separation respected.
- UI respects design tokens.
- Lazy-load ready.

---

# 11) Lazy Loading Policy

All features must be designed to be lazy-loadable.

New features must:
- Export `routes.ts`
- Be compatible with `loadChildren`

Migration of existing features to lazy loading must follow a ticket.

---

# 12) Evolution Rule

Playbook must be updated BEFORE introducing:

- Fine-grained permissions
- Backend intermediary layer
- Cross-feature global state engine
- Caching layer
- Event bus
- Micro-frontend strategy
- Major routing refactor

Architecture changes require playbook update first.

---

# 13) AI Safety Guardrails

AI agents must:

- Never introduce Supabase calls inside components.
- Never bypass Store → Service → Supabase pattern.
- Never introduce RxJS-based global state.
- Never introduce UI frameworks without explicit instruction.
- Never modify core architectural rules without updating this playbook first.
- Always prioritize clarity and maintainability over cleverness.

---

# 14) Philosophy

MVP first.
Stability second.
Framework intentionally.

SaaS Foundation must grow intentionally, not accidentally.
