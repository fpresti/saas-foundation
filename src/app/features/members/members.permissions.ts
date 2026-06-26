/**
 * Tenant permission codes for Members UI. Gated via {@link PermissionService}
 * and backend `has_permission`; add these to your role_permission seeds if missing.
 */
export const MEMBERS_PERMISSION = {
  /** View members list (route already uses this). */
  read: 'tenant.members.read',
  /** Create invitation RPC. */
  invite: 'tenant.members.invite',
  /** Assign roles via `assign_tenant_user_role` (and future remove). */
  manageRoles: 'tenant.roles.assign',
} as const;
