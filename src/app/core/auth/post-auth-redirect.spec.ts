import {
  buildAcceptInvitationUrl,
  buildLoginCallbackUrl,
  clearPostAuthRedirect,
  isSafeInternalRedirect,
  persistPostAuthRedirect,
  POST_AUTH_REDIRECT_KEY,
  resolvePostAuthRedirect,
} from './post-auth-redirect';

describe('post-auth-redirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('buildAcceptInvitationUrl encodes token', () => {
    expect(buildAcceptInvitationUrl('abc+def')).toBe('/accept-invitation?token=abc%2Bdef');
  });

  it('rejects unsafe redirects', () => {
    expect(isSafeInternalRedirect('//evil.com')).toBe(false);
    expect(isSafeInternalRedirect('/accept-invitation?token=x')).toBe(true);
  });

  it('prefers query returnUrl over sessionStorage', () => {
    persistPostAuthRedirect('/stored');
    expect(resolvePostAuthRedirect('/query')).toBe('/query');
  });

  it('falls back to sessionStorage then /', () => {
    persistPostAuthRedirect('/accept-invitation?token=t');
    expect(resolvePostAuthRedirect(null)).toBe('/accept-invitation?token=t');
    clearPostAuthRedirect();
    expect(resolvePostAuthRedirect(null)).toBe('/');
  });

  it('buildLoginCallbackUrl encodes nested query', () => {
    const url = buildLoginCallbackUrl('/accept-invitation?token=abc');
    expect(url).toBe('/login?returnUrl=%2Faccept-invitation%3Ftoken%3Dabc');
  });

  it('persistPostAuthRedirect ignores unsafe urls', () => {
    persistPostAuthRedirect('//evil.com');
    expect(sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)).toBeNull();
  });
});
