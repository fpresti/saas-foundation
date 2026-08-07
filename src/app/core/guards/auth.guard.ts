import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../auth/session.store';

export const authGuard: CanActivateFn = async () => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  if (!sessionStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  await sessionStore.ensureAccessContextReady();

  if (!sessionStore.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { reason: 'deactivated' } });
  }

  return true;
};
