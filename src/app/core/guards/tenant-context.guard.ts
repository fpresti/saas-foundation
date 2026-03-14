import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AccessContextStore } from '../../features/access-context';

export const tenantContextGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const accessContextStore = inject(AccessContextStore);
  const router = inject(Router);

  // Ensure access context has been loaded
  if (accessContextStore.status() !== 'ready') {
    await accessContextStore.load();
  }

  const ctx = accessContextStore.context();

  // Super_admin with multiple tenants must select before dashboard
  if (
    ctx?.is_super_admin === true &&
    ctx.tenant_id === null &&
    ctx.allowed_tenants.length > 0
  ) {
    return router.createUrlTree(['/select-tenant']);
  }

  // If multiple tenants and none selected, force selection screen
  if (
    ctx &&
    ctx.tenant_id === null &&
    ctx.allowed_tenants.length > 1 &&
    (ctx.is_super_admin || ctx.allowed_tenants.length > 1)
  ) {
    return router.createUrlTree(['/select-tenant']);
  }

  // If tenant is selected, allow
  if (ctx?.tenant_id !== null && ctx?.tenant_id !== undefined) {
    return true;
  }

  // Authenticated but no tenant available (edge case)
  if (ctx && ctx.allowed_tenants.length === 0) {
    return router.createUrlTree(['/select-tenant']);
  }

  return true;
};
