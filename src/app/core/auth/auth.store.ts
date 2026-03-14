import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import type { NormalizedError } from '../utils/supabase-error.util';
import { AccessContextStore } from '../../features/access-context';
import { AuthService } from './auth.service';
import { logBootstrap } from './bootstrap-debug.log';

/**
 * @deprecated Internal only. Use {@link SessionStore} as the public state entry point for session + access context.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly accessContextStore = inject(AccessContextStore);

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
      logBootstrap('AuthStore.initialize getSession', {
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      });

      this.unsubscribeAuthChanges = this.authService.onAuthStateChange((s) => {
        const st = this.accessContextStore.status();
        logBootstrap('onAuthStateChange', {
          hasSession: !!s,
          accessContextStatus: st,
        });
        this.session.set(s);
        if (s === null) {
          this.accessContextStore.reset();
        } else {
          // Solo cargar en idle: si status es error, cada TOKEN_REFRESHED re-disparaba load() → bucle + lentitud.
          if (st === 'idle') {
            logBootstrap('Scheduling accessContext.load() from onAuthStateChange (idle)');
            void this.accessContextStore.load();
          }
        }
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
    // Load access context so protected routes can render (app waits for status === 'ready').
    if (result.session) {
      await this.accessContextStore.load();
    }
    return true;
  }

  async signOut(): Promise<void> {
    this.signInError.set(null);
    await this.authService.signOut();
    // Do not set session here; onAuthStateChange will update it.
  }
}
