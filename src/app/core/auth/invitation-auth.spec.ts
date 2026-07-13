import {
  clearInvitationAuthReady,
  isInvitationAuthReady,
  markInvitationAuthReady,
  parseInvitationTokenFromUrl,
} from './invitation-auth';

describe('invitation-auth', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('parseInvitationTokenFromUrl extracts token', () => {
    expect(parseInvitationTokenFromUrl('/accept-invitation?token=abc')).toBe('abc');
    expect(parseInvitationTokenFromUrl('/')).toBeNull();
  });

  it('marks auth ready per token', () => {
    markInvitationAuthReady('t1');
    expect(isInvitationAuthReady('t1')).toBe(true);
    expect(isInvitationAuthReady('t2')).toBe(false);
    clearInvitationAuthReady('t1');
    expect(isInvitationAuthReady('t1')).toBe(false);
  });
});
