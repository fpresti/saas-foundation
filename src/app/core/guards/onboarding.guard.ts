import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { TenantStore } from '../tenant/tenant.store';

/**
 * Use on routes that require at least one tenant (e.g. Home).
 * Do NOT apply to /select-tenant or /onboarding/create-tenant.
 * Redirects to /onboarding/create-tenant only when user has no tenants AND is not super_admin.
 */
export const onboardingGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const tenantStore = inject(TenantStore);
  const router = inject(Router);

  if (tenantStore.isLoading()) {
    await tenantStore.initialize();
  }

  const hasNoTenants = tenantStore.availableTenants().length === 0;
  const isSuperAdmin = tenantStore.platformRole() === 'super_admin';

  if (hasNoTenants && !isSuperAdmin) {
    return router.createUrlTree(['/onboarding/create-tenant']);
  }

  return true;
};
