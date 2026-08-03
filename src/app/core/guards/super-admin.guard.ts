import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionStore } from '../auth/session.store';

/** Allows access only when the current user is a platform super_admin. */
export const superAdminGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  if (!sessionStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  await sessionStore.ensureAccessContextReady();

  if (sessionStore.isSuperAdmin()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
