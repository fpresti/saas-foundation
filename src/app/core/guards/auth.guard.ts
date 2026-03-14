import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../auth/session.store';

export const authGuard: CanActivateFn = () => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);
  if (sessionStore.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
