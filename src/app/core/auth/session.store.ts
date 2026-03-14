import { computed, inject, Injectable } from '@angular/core';
import { AccessContextStore } from '../../features/access-context';
import { logBootstrap } from './bootstrap-debug.log';
import { AuthStore } from './auth.store';

/**
 * Facade over AuthStore + AccessContextStore. Single entry point for session + access context.
 * Does not own duplicate state; delegates to existing stores.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly authStore = inject(AuthStore);
  private readonly accessContextStore = inject(AccessContextStore);

  /** Supabase session (owned by AuthStore). */
  readonly session = this.authStore.session;

  /** Current RPC access context; read-only view of AccessContextStore.context. */
  readonly accessContext = computed(() => this.accessContextStore.context());

  readonly activeTenantId = computed(
    () => this.accessContextStore.context()?.tenant_id ?? null
  );

  /**
   * True while session is resolving or, when authenticated, until access context is ready.
   * Stops on 'error' so the shell is not stuck forever if get_access_context fails or returns empty.
   */
  readonly loading = computed(
    () =>
      this.authStore.isLoading() ||
      (this.authStore.isAuthenticated() &&
        this.accessContextStore.status() !== 'ready' &&
        this.accessContextStore.status() !== 'error')
  );

  readonly isAuthenticated = this.authStore.isAuthenticated;

  readonly isSuperAdmin = computed(
    () => this.accessContextStore.context()?.is_super_admin ?? false
  );

  readonly allowedTenants = computed(
    () => this.accessContextStore.context()?.allowed_tenants ?? []
  );

  /** Resolved allowed tenant + role; derived via AccessContextStore rules. */
  readonly activeTenant = computed(() => this.accessContextStore.activeTenant());

  /** Access context load lifecycle (for tenant-select etc.). */
  readonly accessContextStatus = computed(() => this.accessContextStore.status());
  readonly accessContextError = computed(() => this.accessContextStore.error());

  /** Same as AuthStore.signOut (awaitable for shell logout + navigate). */
  async signOut(): Promise<void> {
    await this.authStore.signOut();
  }

  /**
   * Session listener + optional access context load (same sequence as App bootstrap).
   */
  async initialize(): Promise<void> {
    logBootstrap('SessionStore.initialize start');
    await this.authStore.initialize();
    const authed = this.authStore.isAuthenticated();
    logBootstrap('SessionStore.initialize after auth', {
      isAuthenticated: authed,
      accessContextStatus: this.accessContextStore.status(),
    });
    if (authed) {
      try {
        await this.accessContextStore.load();
      } catch {
        logBootstrap('SessionStore.initialize load() failed (status should be error)');
      }
    } else {
      this.accessContextStore.reset();
    }
    logBootstrap('SessionStore.initialize end', {
      accessContextStatus: this.accessContextStore.status(),
      loading: this.loading(),
    });
  }

  /** Reload access context from RPC (current or default server context). */
  async refreshAccessContext(): Promise<void> {
    await this.accessContextStore.load(this.activeTenantId());
  }

  /** Load access context once if not already ready (for guards after bootstrap). */
  async ensureAccessContextReady(): Promise<void> {
    if (this.accessContextStore.status() !== 'ready') {
      await this.accessContextStore.load();
    }
  }

  /** Switch active tenant and reset app caches (delegates to AccessContextStore). */
  async setActiveTenant(tenantId: string): Promise<void> {
    await this.accessContextStore.selectTenant(tenantId);
  }

  /**
   * Clear access context immediately; sign out in background (same end state as logout).
   * Void so callers are not forced to await; session updates when Supabase completes.
   */
  clear(): void {
    this.accessContextStore.reset();
    void this.authStore.signOut();
  }
}
