import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionStore } from '../auth/session.store';

/**
 * Use on routes that require at least one tenant (e.g. Home).
 * Do NOT apply to /select-tenant or /onboarding/create-tenant.
 * Redirects to /onboarding/create-tenant only when user has no tenants AND is not super_admin.
 */
export const onboardingGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  await sessionStore.ensureAccessContextReady();

  const hasNoTenants = sessionStore.allowedTenants().length === 0;
  const isSuperAdmin = sessionStore.isSuperAdmin();

  if (hasNoTenants && !isSuperAdmin) {
    return router.createUrlTree(['/onboarding/create-tenant']);
  }

  return true;
};
