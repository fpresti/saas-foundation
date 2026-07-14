import {
  needsMemberProfileOnboarding,
  shouldForceMemberProfileOnboarding,
} from './member-profile-onboarding.util';

describe('member-profile-onboarding.util', () => {
  it('needsMemberProfileOnboarding detects empty names', () => {
    expect(needsMemberProfileOnboarding(null)).toBe(true);
    expect(needsMemberProfileOnboarding('')).toBe(true);
    expect(needsMemberProfileOnboarding('   ')).toBe(true);
    expect(needsMemberProfileOnboarding('Ana')).toBe(false);
  });

  it('shouldForceMemberProfileOnboarding only for members without name', () => {
    expect(shouldForceMemberProfileOnboarding('owner', null)).toBe(false);
    expect(shouldForceMemberProfileOnboarding('member', null)).toBe(true);
    expect(shouldForceMemberProfileOnboarding('member', 'Ana')).toBe(false);
  });
});
