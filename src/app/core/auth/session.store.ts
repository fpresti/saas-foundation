import { computed, inject, Injectable } from '@angular/core';
import { AccessContextStore } from '../../features/access-context';
import { logBootstrap } from './bootstrap-debug.log';
import { AuthStore } from './auth.store';

/**
 * Single public entry point for session + access context.
 * Delegates to internal AuthStore / AccessContextStore (do not inject those from features).
 *
 * ## Active tenant (public API)
 * All active-tenant state is derived from the last successful `get_access_context` result
 * except switching, which goes through {@link SessionStore.setActiveTenant}.
 * - **activeTenantId** — RPC `tenant_id` (null until context ready or when server returns no tenant).
 * - **activeTenant** — Entry from `allowed_tenants` for `tenant_id`, plus current `tenant_role`.
 * - **allowedTenants** — RPC `allowed_tenants` for the session.
 * - **setActiveTenant** — Reload context for that tenant + app reset (same as tenant switch).
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly authStore = inject(AuthStore);
  private readonly accessContextStore = inject(AccessContextStore);

  /** Supabase session (owned by AuthStore). */
  readonly session = this.authStore.session;

  /** Password sign-in error (owned by AuthStore). */
  readonly signInError = this.authStore.signInError;

  /** Current RPC access context; read-only view of AccessContextStore.context. */
  readonly accessContext = computed(() => this.accessContextStore.context());

  /** Active tenant id from access context (server-preferred/current tenant after load). */
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

  /** Tenants the user may access (from access context). */
  readonly allowedTenants = computed(
    () => this.accessContextStore.context()?.allowed_tenants ?? []
  );

  /** Current allowed tenant row + role for {@link activeTenantId}; null if none selected. */
  readonly activeTenant = computed(() => this.accessContextStore.activeTenant());

  /** Access context load lifecycle (for tenant-select etc.). */
  readonly accessContextStatus = computed(() => this.accessContextStore.status());
  readonly accessContextError = computed(() => this.accessContextStore.error());

  /** Same as AuthStore.signOut (awaitable for shell logout + navigate). */
  async signOut(): Promise<void> {
    await this.authStore.signOut();
  }

  /** Password sign-in; loads access context on success (delegates to AuthStore). */
  async signIn(email: string, password: string): Promise<boolean> {
    return this.authStore.signIn(email, password);
  }

  /**
   * Load access context from RPC. Omit tenantId for default/server context (e.g. after onboarding).
   */
  async loadAccessContext(tenantId?: string | null): Promise<void> {
    await this.accessContextStore.load(tenantId);
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

  /** Reload access context from RPC for the current active tenant id. */
  async refreshAccessContext(): Promise<void> {
    await this.loadAccessContext(this.activeTenantId());
  }

  /** Load access context once if not already ready (for guards after bootstrap). */
  async ensureAccessContextReady(): Promise<void> {
    if (this.accessContextStore.status() !== 'ready') {
      await this.accessContextStore.load();
    }
  }

  /**
   * Switch active tenant: RPC reload for `tenantId`, then global app reset (nav caches, etc.).
   * Public entry point for tenant select + shell switch flows.
   */
  async setActiveTenant(tenantId: string): Promise<void> {
    await this.accessContextStore.selectTenant(tenantId);
  }

  /**
   * Clear access context immediately; sign out in background (same end state as logout).
   * Void so callers are not forced to await; session updates when Supabase completes.
   * Resets tenant-related client state so the next session does not inherit the previous tenant.
   */
  clear(): void {
    this.accessContextStore.reset();
    void this.authStore.signOut();
  }
}
