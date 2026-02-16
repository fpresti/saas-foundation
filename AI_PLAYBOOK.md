# SaaS Foundation --- AI Working Agreement (MVP v1)

This document defines how AI agents (Cursor / Codex) must operate in
this repository.

If any instruction conflicts with this document, **this document wins**.

This is the MVP version, intentionally minimal but designed to evolve
into a reusable SaaS framework.

------------------------------------------------------------------------

# 0) Architecture Vision

SaaS Foundation is a **strict multi-tenant SaaS foundation**.

MVP Scope: 
- Supabase (Postgres + RLS + RPC + Auth) 
- Angular 21(Standalone + Signals) 
- Tailwind CSS v4 (CSS variables) 
- Isolation enforced via RLS 
- Backend is authoritative
- The application must not render protected features until both:
	- Auth session is resolved
	- Tenant context is loaded

Future: 
- May evolve to include backend layer 
- May evolve to fine-grained permissions system 
- This playbook will evolve with architecture

------------------------------------------------------------------------

# 1) Core Non-Negotiable Principles

## 1.1 Backend is Authoritative

-   The frontend never grants permissions.
-   The frontend never assumes access.
-   Security is enforced by RLS and/or RPC.
-   UI visibility ≠ authorization.

## 1.2 Strict Multi-Tenant Isolation

-   Every business entity belongs to a `tenant_id`.
-   Every query must respect tenant context.
-   Never implement client-side filtering for security.
-   Never bypass RLS expectations.

## 1.3 Simplicity Over Engineering Ego

-   Prefer simple and readable patterns.
-   Avoid abstraction layers unless justified.
-   No premature framework building.
-   MVP first, framework later.

------------------------------------------------------------------------

# 2) Frontend Stack Rules

## 2.1 Angular Rules

-   Angular 21.
-   Standalone Components only.
-   Signals for state management.
-   Services return Promises.
-   Avoid RxJS unless strictly necessary.
-   If RxJS is used, justify it in comments.

## 2.2 Component Discipline

-   Components must be thin.
-   No direct Supabase calls inside components.
-   Use Store + Service pattern.
-   Split components if \> 300 lines.

## 2.3 Store Pattern (Signals)

Each feature may have: 
- state signal 
- computed selectors 
- async actions (Promise-based) 
- error + loading state management

Stores orchestrate services. 
Components consume stores.

------------------------------------------------------------------------

# 3) Styling Rules (Tailwind v4 + CSS Variables)

Tailwind is configured via CSS variables only.

Rules: 
- Do NOT use `tailwind.config.js`. 
- Do NOT define text colors in components. 
- Use these tokens: 
	-`bg-[var(--color-bg-primary)]` 
	-`bg-[var(--color-bg-secondary)]` 
	-`border-[var(--color-border-default)]` 
- Use `rounded` (not rounded-lg / xl). 
- Respect global button/input styles. 
- No inline styles unless strictly required.

No new UI libraries without explicit request.

------------------------------------------------------------------------

# 4) Supabase Integration Rules

## 4.1 Single Client Source

-   Supabase client must be created in one central place.
-   No multiple instances scattered in features.

## 4.2 RPC-First for Critical Writes

Use RPC for: 
- create tenant with owner 
- invitations 
- accepting invitations 
- membership changes 
- subscription changes 
- any role-related logic

Direct table operations are allowed only for: 
- tenant-scoped non-critical entities 
- read-only queries protected by RLS

If unsure → use RPC.

## 4.3 Error Normalization

All Supabase errors must be normalized into:

{ 
 code: string 
 message: string 
 details?: unknown 
}

- Never expose raw Supabase error objects to UI.
- Must map Supabase error codes when possible.
- Never leak raw error stack traces.

------------------------------------------------------------------------

# 5) Roles Model (MVP)

Platform Role: 
- super_admin

Tenant Roles: 
- owner 
- member

Frontend may: 
- Hide or show UI elements based on role (cosmetic only).

Frontend must not: 
- Enforce data restrictions. 
- Implement permission engines. 
- Filter server data for "security".

Authorization always belongs to backend/RLS.

------------------------------------------------------------------------

# 6) Folder Structure

```text
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
        index.ts

    shared/
      components/
      ui/
      types/

    app.routes.ts
```

- Core: Cross-cutting concerns only.
- Features: Self-contained domain logic.
- Shared: Reusable non-core UI elements.
- Use separate .html and .ts files for components.
- Do not use inline templates unless explicitly requested.


------------------------------------------------------------------------

# 7) Ticket-Based AI Workflow

AI must operate in structured tickets.

Every task must define: 
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

------------------------------------------------------------------------

# 8) Forbidden Patterns (Hard NO)

-   RxJS-based global state management.
-   Supabase calls inside components.
-   Permission logic in Angular.
-   Bypassing RPC for critical writes.
-   New UI frameworks.
-   Setting text color classes.
-   Overabstracting patterns in MVP stage.

------------------------------------------------------------------------

# 9) Feature Template (MVP)
```
features/
  <feature-name>/
    pages/
    components/
    services/
    stores/
    types.ts
    index.ts
```

Pattern:

Component → Store → Service → Supabase/RPC

Never: Component → Supabase

------------------------------------------------------------------------

# 10) Definition of Done (MVP)

A feature is done when: 
- Build passes. 
- No forbidden patterns introduced. 
- UI respects global tokens. 
- RLS/RPC is respected. 
- No fake client-side authorization. 
- Code is readable and simple.

------------------------------------------------------------------------

# 11) Evolution Rule

This playbook must be updated BEFORE introducing: 
- Fine-grained permission system 
- Backend intermediary layer 
- Major structural refactor 
- Cross-feature shared state engines 
- New architectural patterns

Architecture changes require playbook update first.

------------------------------------------------------------------------

# 12) Philosophy

MVP first. Stability second. Framework later.

SaaS Foundation must grow intentionally, not accidentally.
