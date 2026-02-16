import { computed, Injectable, signal } from '@angular/core';

/** Mock session shape. Replace with Supabase Session when integrating. */
export type AuthSession = { id: string; email?: string } | null;

@Injectable({ providedIn: 'root' })
export class AuthStore {
  readonly session = signal<AuthSession>(null);
  readonly isLoading = signal<boolean>(true);

  readonly isAuthenticated = computed(() => this.session() !== null);

  /** Resolve session (mock). Call once at app bootstrap. */
  async initialize(): Promise<void> {
    this.isLoading.set(true);
    try {
      const session = await this.mockGetSession();
      this.session.set(session);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Mock sign-in to allow testing protected routes without Supabase. */
  mockSignIn(email = 'mock@saas-foundation.local'): void {
    this.session.set({ id: 'mock-user-id', email });
  }

  /** Mock sign-out. */
  mockSignOut(): void {
    this.session.set(null);
  }

  /** Mock: no real Supabase yet. Returns null (unauthenticated). */
  private async mockGetSession(): Promise<AuthSession> {
    await new Promise((r) => setTimeout(r, 100));
    return null;
  }
}
