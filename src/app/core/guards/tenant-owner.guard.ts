import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionStore } from '../auth/session.store';

/** Allows access only when the active tenant membership is `owner`. */
export const tenantOwnerGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  if (!sessionStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  await sessionStore.ensureAccessContextReady();

  if (!sessionStore.activeTenantId()) {
    return router.createUrlTree(['/select-tenant']);
  }

  if (sessionStore.accessContext()?.tenant_role === 'owner') {
    return true;
  }

  return router.createUrlTree(['/']);
};
