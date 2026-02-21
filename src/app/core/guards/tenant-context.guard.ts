import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { TenantStore } from '../tenant/tenant.store';

export const tenantContextGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const tenantStore = inject(TenantStore);
  const router = inject(Router);

  // Ensure tenant context has been initialized
  if (tenantStore.isLoading()) {
    await tenantStore.initialize();
  }

  // Super_admin always must select a tenant before dashboard
  if (
    tenantStore.platformRole() === 'super_admin' &&
    tenantStore.activeTenant() === null &&
    tenantStore.availableTenants().length > 0
  ) {
    return router.createUrlTree(['/select-tenant']);
  }

  // If multiple tenants and none selected, force selection screen
  if (tenantStore.needsTenantSelection()) {
    return router.createUrlTree(['/select-tenant']);
  }

  // If tenant is selected, allow
  if (tenantStore.activeTenant() !== null) {
    return true;
  }

  // Authenticated but no tenant available (edge case)
  if (tenantStore.availableTenants().length === 0) {
    return router.createUrlTree(['/select-tenant']);
  }

  return true;
};
