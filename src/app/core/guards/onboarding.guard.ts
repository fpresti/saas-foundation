import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AccessContextStore } from '../../features/access-context';

/**
 * Use on routes that require at least one tenant (e.g. Home).
 * Do NOT apply to /select-tenant or /onboarding/create-tenant.
 * Redirects to /onboarding/create-tenant only when user has no tenants AND is not super_admin.
 */
export const onboardingGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const accessContextStore = inject(AccessContextStore);
  const router = inject(Router);

  if (accessContextStore.status() !== 'ready') {
    await accessContextStore.load();
  }

  const hasNoTenants = accessContextStore.allowedTenants().length === 0;
  const isSuperAdmin = accessContextStore.isSuperAdmin();

  if (hasNoTenants && !isSuperAdmin) {
    return router.createUrlTree(['/onboarding/create-tenant']);
  }

  return true;
};
