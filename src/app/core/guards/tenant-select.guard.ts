import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionStore } from '../auth/session.store';

/**
 * /select-tenant is only for users who must pick among multiple tenants.
 * Aligns with tenant-context redirect rules (not only super_admin nav visibility).
 */
export const tenantSelectGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  await sessionStore.ensureAccessContextReady();

  const tenantCount = sessionStore.allowedTenants().length;
  if (tenantCount > 1) {
    return true;
  }

  return router.createUrlTree(['/']);
};
