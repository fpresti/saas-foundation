import {
  needsMemberProfileOnboarding,
  shouldForceMemberProfileOnboarding,
} from './member-profile-onboarding.util';

describe('member-profile-onboarding.util', () => {
  it('needsMemberProfileOnboarding detects empty names', () => {
    expect(needsMemberProfileOnboarding(null, null)).toBe(true);
    expect(needsMemberProfileOnboarding('', '')).toBe(true);
    expect(needsMemberProfileOnboarding('   ', '  ')).toBe(true);
    expect(needsMemberProfileOnboarding('Ana', null)).toBe(false);
    expect(needsMemberProfileOnboarding(null, 'García')).toBe(false);
    expect(needsMemberProfileOnboarding('Ana', 'García')).toBe(false);
  });

  it('shouldForceMemberProfileOnboarding only for members without name', () => {
    expect(shouldForceMemberProfileOnboarding('owner', null, null)).toBe(false);
    expect(shouldForceMemberProfileOnboarding('member', null, null)).toBe(true);
    expect(shouldForceMemberProfileOnboarding('member', 'Ana', 'García')).toBe(false);
  });
});
