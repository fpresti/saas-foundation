import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import type { NormalizedError } from '../utils/supabase-error.util';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);

  private unsubscribeAuthChanges: (() => void) | null = null;

  readonly session = signal<Session | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly signInError = signal<NormalizedError | null>(null);

  readonly isAuthenticated = computed(() => this.session() !== null);

  async initialize(): Promise<void> {
    // prevent double init (HMR / accidental re-call)
    if (this.unsubscribeAuthChanges) return;

    this.isLoading.set(true);
    try {
      const session = await this.authService.getSession();
      this.session.set(session);

      this.unsubscribeAuthChanges = this.authService.onAuthStateChange((s) => {
        this.session.set(s);
      });
    } catch {
      this.session.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  async signIn(email: string, password: string): Promise<boolean> {
    this.signInError.set(null);

    const result = await this.authService.signInWithPassword(email, password);
    if ('error' in result) {
      this.signInError.set(result.error);
      return false;
    }

    // Set session immediately to avoid race: navigation happens before onAuthStateChange fires.
    this.session.set(result.session);
    return true;
  }

  async signOut(): Promise<void> {
    this.signInError.set(null);
    await this.authService.signOut();
    // Do not set session here; onAuthStateChange will update it.
  }
}
