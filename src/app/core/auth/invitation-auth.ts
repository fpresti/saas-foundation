/** After login/sign-up for an invitation, skip clearing an existing session again. */
export const INVITATION_AUTH_READY_PREFIX = 'saas-foundation.invitationAuthReady.';

export function parseInvitationTokenFromUrl(url: string): string | null {
  if (!url.startsWith('/accept-invitation')) return null;
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  return new URLSearchParams(query).get('token');
}

export function markInvitationAuthReady(token: string): void {
  if (!token.trim()) return;
  sessionStorage.setItem(`${INVITATION_AUTH_READY_PREFIX}${token}`, '1');
}

export function isInvitationAuthReady(token: string): boolean {
  if (!token.trim()) return false;
  return sessionStorage.getItem(`${INVITATION_AUTH_READY_PREFIX}${token}`) === '1';
}

export function clearInvitationAuthReady(token: string): void {
  if (!token.trim()) return;
  sessionStorage.removeItem(`${INVITATION_AUTH_READY_PREFIX}${token}`);
}
