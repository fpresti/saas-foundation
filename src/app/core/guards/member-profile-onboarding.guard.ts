import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import {
  needsMemberProfileOnboarding,
  shouldForceMemberProfileOnboarding,
} from '../profile/member-profile-onboarding.util';
import { ProfileService } from '../profile/profile.service';
import { SessionStore } from '../auth/session.store';

/** Invited members with incomplete profile must finish /onboarding/complete-profile first. */
export const memberProfileOnboardingGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const sessionStore = inject(SessionStore);
  const profileService = inject(ProfileService);
  const router = inject(Router);

  await sessionStore.ensureAccessContextReady();

  const tenantRole = sessionStore.accessContext()?.tenant_role ?? null;
  if (tenantRole !== 'member') {
    return true;
  }

  try {
    const profile = await profileService.getOwnProfile();
    if (
      shouldForceMemberProfileOnboarding(tenantRole, profile?.givenName, profile?.familyName)
    ) {
      return router.createUrlTree(['/onboarding/complete-profile']);
    }
  } catch {
    return true;
  }

  return true;
};

/** Route entry: only members who still need profile onboarding. */
export const completeProfileOnboardingGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const sessionStore = inject(SessionStore);
  const profileService = inject(ProfileService);
  const router = inject(Router);

  await sessionStore.ensureAccessContextReady();

  const tenantRole = sessionStore.accessContext()?.tenant_role ?? null;
  if (tenantRole !== 'member') {
    return router.createUrlTree(['/']);
  }

  try {
    const profile = await profileService.getOwnProfile();
    if (!needsMemberProfileOnboarding(profile?.givenName, profile?.familyName)) {
      return router.createUrlTree(['/']);
    }
  } catch {
    return router.createUrlTree(['/']);
  }

  return true;
};
