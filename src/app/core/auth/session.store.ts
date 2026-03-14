import { computed, inject, Injectable } from '@angular/core';
import { AccessContextStore } from '../../features/access-context';
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
   * Matches App shell gating: auth loading OR authenticated with context not yet ready.
   */
  readonly loading = computed(
    () =>
      this.authStore.isLoading() ||
      (this.authStore.isAuthenticated() &&
        this.accessContextStore.status() !== 'ready')
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

  /**
   * Session listener + optional access context load (same sequence as App bootstrap).
   */
  async initialize(): Promise<void> {
    await this.authStore.initialize();
    if (this.authStore.isAuthenticated()) {
      await this.accessContextStore.load();
    } else {
      this.accessContextStore.reset();
    }
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
