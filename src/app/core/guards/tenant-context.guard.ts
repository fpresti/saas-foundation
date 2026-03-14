import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionStore } from '../auth/session.store';

/**
 * Evita bucle infinito: si ya vamos a /select-tenant u onboarding, no redirigir otra vez
 * al mismo sitio (el guard del padre se ejecuta también en rutas hijas).
 */
function isTenantSelectionOrOnboardingPath(url: string): boolean {
  const path = url.split('?')[0];
  return (
    path === '/select-tenant' ||
    path.startsWith('/select-tenant/') ||
    path.startsWith('/onboarding/create-tenant')
  );
}

export const tenantContextGuard: CanActivateFn = async (route, state): Promise<boolean | UrlTree> => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  await sessionStore.ensureAccessContextReady();

  if (isTenantSelectionOrOnboardingPath(state.url)) {
    return true;
  }

  const ctx = sessionStore.accessContext();

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
