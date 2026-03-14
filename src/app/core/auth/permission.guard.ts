import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PermissionService } from './permission.service';
import { SessionStore } from './session.store';

/** Route data key for required permission code (RPC has_permission). */
export const PERMISSION_ROUTE_DATA_KEY = 'permission' as const;

/**
 * Route-level authorization via {@link PermissionService} (cached `has_permission` RPC per tenant).
 * - No `data.permission` → allow.
 * - Unauthenticated → `/login` (same as authGuard).
 * - Authenticated, no tenant context → `/select-tenant`.
 * - Missing permission → `/` (no dedicated forbidden route in app; see README assumption).
 *
 * Use after auth + tenant context guards on parent routes when possible.
 */
export const permissionGuard: CanActivateFn = async (
  route
): Promise<boolean | UrlTree> => {
  const raw = route.data[PERMISSION_ROUTE_DATA_KEY];
  const required =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
  if (!required) {
    return true;
  }

  const sessionStore = inject(SessionStore);
  const router = inject(Router);
  const permissionService = inject(PermissionService);

  if (!sessionStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  await sessionStore.ensureAccessContextReady();

  const tenantId = sessionStore.activeTenantId();
  if (!tenantId) {
    return router.createUrlTree(['/select-tenant']);
  }

  const allowed = await permissionService.hasPermission(required);
  if (allowed) {
    return true;
  }

  /** No `/forbidden` route; home is the fallback (user stays signed in). */
  return router.createUrlTree(['/']);
};
