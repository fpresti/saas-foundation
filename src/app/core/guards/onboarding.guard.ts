import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { TenantStore } from '../tenant/tenant.store';

/**
 * Use on routes that require at least one tenant (e.g. Home).
 * Do NOT apply to /select-tenant or /onboarding/create-tenant.
 * If authenticated and availableTenants.length === 0, redirects to /onboarding/create-tenant.
 */
export const onboardingGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const tenantStore = inject(TenantStore);
  const router = inject(Router);

  if (tenantStore.isLoading()) {
    await tenantStore.initialize();
  }

  if (tenantStore.availableTenants().length === 0) {
    return router.createUrlTree(['/onboarding/create-tenant']);
  }

  return true;
};
