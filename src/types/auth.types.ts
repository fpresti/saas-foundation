/**
 * Frontend auth/session helpers. Supabase session and user types live in
 * `@supabase/supabase-js`; this file only adds app-level aliases and guards.
 */
import type { Session, User } from '@supabase/supabase-js';

/** Authenticated session (user present). */
export type AuthenticatedSession = Session & { user: User };

export function isAuthenticatedSession(session: Session | null): session is AuthenticatedSession {
  return session != null && session.user != null;
}

/** User id when signed in; use after `isAuthenticatedSession`. */
export function sessionUserId(session: AuthenticatedSession): string {
  return session.user.id;
}
