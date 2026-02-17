import { Injectable } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/supabase.client';
import { NormalizedError, normalizeAuthError, normalizeError } from '../utils/supabase-error.util';

export type SignInResult =
  | { session: Session | null}
  | { error: NormalizedError };
export type SignOutResult = { error?: NormalizedError };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = getSupabaseClient();

  /** Get current session. Call once at bootstrap. */
  async getSession(): Promise<Session | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      const normalized = normalizeAuthError(error);
      throw normalized ?? { code: 'unknown', message: 'Failed to get session' };
    }
    return data.session;
  }

  /**
   * Subscribe to auth state changes. Callback receives current session (null when signed out).
   * Returns unsubscribe function.
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const {
      data: { subscription }
    } = this.supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  }

  /** Sign in with email and password. */
  async signInWithPassword(
    email: string,
    password: string
  ): Promise<SignInResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    const normalized = normalizeAuthError(error);
    if (normalized) return { error: normalized };
    return { session: data.session ?? null };
  }

  /** Sign out. */
  async signOut(): Promise<SignOutResult> {
    const { error } = await this.supabase.auth.signOut();
    const normalized = normalizeAuthError(error);
    if (normalized) return { error: normalized };
    return {};
  }

  /** Send password recovery email. Redirects to reset-password after user clicks link. */
  async sendPasswordRecovery(email: string): Promise<{ error?: NormalizedError }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    const normalized = normalizeError(error);
    if (normalized) return { error: normalized };
    return {};
  }

  /** Update password (requires valid session, e.g. from recovery link). */
  async updatePassword(newPassword: string): Promise<{ error?: NormalizedError }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    const normalized = normalizeError(error);
    if (normalized) return { error: normalized };
    return {};
  }
}
