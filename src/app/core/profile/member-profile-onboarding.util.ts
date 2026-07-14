/** True when the user still needs to complete the invited-member profile wizard. */
export function needsMemberProfileOnboarding(fullName: string | null | undefined): boolean {
  return !(fullName?.trim() ?? '');
}

export function shouldForceMemberProfileOnboarding(
  tenantRole: 'owner' | 'member' | null | undefined,
  fullName: string | null | undefined
): boolean {
  return tenantRole === 'member' && needsMemberProfileOnboarding(fullName);
}
