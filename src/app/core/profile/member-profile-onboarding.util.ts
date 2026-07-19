import { formatDisplayName } from './profile.types';

/** True when the user still needs to complete the invited-member profile wizard. */
export function needsMemberProfileOnboarding(
  givenName: string | null | undefined,
  familyName: string | null | undefined
): boolean {
  return !formatDisplayName(givenName, familyName);
}

export function shouldForceMemberProfileOnboarding(
  tenantRole: 'owner' | 'member' | null | undefined,
  givenName: string | null | undefined,
  familyName: string | null | undefined
): boolean {
  return tenantRole === 'member' && needsMemberProfileOnboarding(givenName, familyName);
}
