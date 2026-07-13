export const POST_AUTH_REDIRECT_KEY = 'saas-foundation.postAuthRedirect';

export function buildAcceptInvitationUrl(token: string): string {
  return `/accept-invitation?token=${encodeURIComponent(token)}`;
}

/** Only allow same-origin relative paths (no open redirect). */
export function isSafeInternalRedirect(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

export function persistPostAuthRedirect(url: string): void {
  if (!isSafeInternalRedirect(url)) return;
  sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, url);
}

export function resolvePostAuthRedirect(queryReturnUrl: string | null): string {
  if (queryReturnUrl && isSafeInternalRedirect(queryReturnUrl)) {
    return queryReturnUrl;
  }
  const stored = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (stored && isSafeInternalRedirect(stored)) {
    return stored;
  }
  return '/';
}

export function clearPostAuthRedirect(): void {
  sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
}

/** Supabase magic-link callback; preserves returnUrl through email round-trip. */
export function buildLoginCallbackUrl(returnUrl: string): string {
  return `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

export function buildMagicLinkRedirectUrl(returnUrl: string): string {
  const target = resolvePostAuthRedirect(returnUrl);
  return `${window.location.origin}${buildLoginCallbackUrl(target)}`;
}
