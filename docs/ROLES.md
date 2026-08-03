# Roles, Memberships, Permissions & Entitlement

Authoritative reference for access control in SaaS Foundation.  
Security is enforced in **Postgres (RLS + RPC)**; the frontend only reflects permissions cosmetically.

---

## 1) Two axes (not a linear chain)

### Product / entitlement

`Tenant → Subscription → Plan → Features` (+ Billing hangs off Subscription in phase 2)

### Authorization

`User → Membership (tenant_members) → Roles (1+) → Permissions`

### Effective access

```
puede hacer X =
  (tiene permiso X vía algún rol asignado)
  ∩ (el tenant tiene la feature que habilita X)
```

**Hard-gates (exceptions):**

| Gate | Rule |
|------|------|
| `is_super_admin()` | Always `true` for any permission code |
| `is_tenant_owner(tenant_id)` | `true` for **non-`platform.*`** permissions (no feature check) |
| `platform.*` | Only via `is_super_admin()` — never via tenant roles or owner |

`has_permission(tenant_id, code)` implements the above. Eligible subscription statuses for feature gating: `active`, `trialing`.

---

## 2) Three membership layers

These are **not** interchangeable.

| Layer | Values | Storage | Purpose |
|-------|--------|---------|---------|
| **Platform** | `super_admin` | `super_admins` | Cross-tenant / catalog CRUD |
| **Tenant membership** | `owner`, `member` | `tenant_members.member_type` | Structural relationship |
| **Tenant RBAC** | `tenant_manager`, `collaborator`, `viewer`, custom… | `roles` + `role_permissions` + `tenant_member_roles` | Operational permissions |

```mermaid
flowchart TB
  subgraph platform [Platform]
    SA[super_admin]
  end

  subgraph membership [tenant_members.member_type]
    OW[owner]
    MB[member]
  end

  subgraph rbac [roles per tenant]
    TM[tenant_manager]
    CO[collaborator]
    VI[viewer]
    CU[custom roles]
  end

  subgraph entitlement [Plan features]
    PL[Plan]
    FE[Features]
    PL --> FE
  end

  SA -->|is_super_admin| AllTenants[All tenants]
  OW -->|is_tenant_owner| AllTenantPerms[All tenant permissions]
  MB --> rbac
  TM --> Perms[role_permissions]
  CO --> Perms
  VI --> Perms
  Perms --> FE
```

### 2.1 `super_admin`

- Row in `public.super_admins`.
- Only actors who can CRUD global **features**, **plans**, **permissions** (and joins).
- Reference codes: `platform.features.*`, `platform.plans.*`, `platform.permissions.*` — **not** granted via tenant roles.

### 2.2 `owner` (`member_type`)

- Implicit full tenant-scoped access via `is_tenant_owner`.
- Can change plan (`change_tenant_plan`), assign roles, manage members.
- Does **not** require `tenant_member_roles`.

### 2.3 `member` (`member_type`)

- Default for invited users.
- Permissions only from assigned roles ∩ plan features.
- Invitation accept assigns system role **`collaborator`**.

---

## 3) Features & permission codes

Permissions are named `{scope}.{feature}.{action}`.

| Feature code | Enables permission codes |
|--------------|--------------------------|
| `profile` | `profile.self.read`, `profile.self.update` |
| `members` | `tenant.members.read`, `.invite`, `.update`, `.delete` |
| `roles` | `tenant.roles.read`, `.assign`, `.create`, `.update`, `.delete`, `tenant.permissions.read` |
| `settings` | `tenant.settings.read`, `.update` |
| `subscription` | `subscription.read` |

Tables: `features`, `plan_features`, `feature_permissions`.  
Phase 1: plans `free`, `premium`, `enterprise` all include the five features above (differentiation later).

Catalog seed: `supabase/migrations/20250315000000_seed_members_permissions.sql` + entitlement migration.

---

## 4) Default roles (seed per tenant)

Created by `seed_default_tenant_roles` / migrated by `migrate_tenant_system_roles`.

| Role code | Name | Default on invite | Purpose |
|-----------|------|-------------------|---------|
| `tenant_manager` | Tenant manager | No | Day-to-day admin without ownership |
| `collaborator` | Collaborator | **Yes** | Standard collaborator |
| `viewer` | Viewer | No | Read-only |

Legacy mapping: `admin` → `tenant_manager`, `member` → `collaborator`, `guest` → `viewer`.

### 4.1 Permission matrix (members; owner = all tenant-scoped)

| Permission | owner | tenant_manager | collaborator | viewer |
|------------|:-----:|:--------------:|:------------:|:------:|
| `profile.self.read` | ✓ | ✓ | ✓ | ✓ |
| `profile.self.update` | ✓ | ✓ | ✓ | ✓ |
| `tenant.members.read` | ✓ | ✓ | ✓ | — |
| `tenant.members.invite` | ✓ | ✓ | — | — |
| `tenant.members.update` | ✓ | ✓ | — | — |
| `tenant.members.delete` | ✓ | ✓ | — | — |
| `tenant.roles.read` | ✓ | ✓ | — | — |
| `tenant.roles.assign` | ✓ | ✓ | — | — |
| `tenant.permissions.read` | ✓ | ✓ | — | — |
| `tenant.roles.create/update/delete` | ✓ | —* | — | — |
| `tenant.settings.read` | ✓ | ✓ | ✓ | ✓ |
| `tenant.settings.update` | ✓ | ✓ | — | — |
| `subscription.read` | ✓ | ✓ | ✓ | — |

\*Owner-only by seed; can be granted via custom roles later (V15).

---

## 5) Key RPCs

| RPC | Who |
|-----|-----|
| `has_permission(tenant_id, code)` | Effective access (role ∩ feature + gates) |
| `change_tenant_plan(tenant_id, plan_id)` | Owner or super_admin |
| `set_tenant_member_roles(tenant_id, user_id, role_ids[])` | Owner, super_admin, or `tenant.roles.assign` |
| `is_tenant_owner` / `is_super_admin` / `is_tenant_member` | Helpers |

---

## 6) App feature map

| Feature folder | Permission gate |
|----------------|-----------------|
| `features/members` | `tenant.members.read` |
| `features/roles` | `tenant.roles.read` |
| `features/settings` | `tenant.settings.read` |
| `features/profile` | auth (+ `profile.self.*` when gated) |

When adding a product capability:

1. Add `permissions` rows + link via `feature_permissions` to a `features` row.
2. Attach feature to plans in `plan_features`.
3. Assign to default roles in `seed_default_tenant_roles` if needed.
4. Guard route / nav with `data.permission`.
5. Update this matrix.

---

## 7) Related issues

Epic: **#34** Planes + Features + RBAC. Phase 2 billing: #49–#51.
