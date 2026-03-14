import { inject, Injectable, signal } from '@angular/core';
import { AccessContextService } from '../../../core/auth/access-context.service';
import { logBootstrap, logBootstrapWarn } from '../../../core/auth/bootstrap-debug.log';
import type { AccessContext, AccessContextStatus } from '../types';
import { AppResetService } from '../../../core/services/app-reset.service';

/**
 * @deprecated Internal only. Use {@link SessionStore} as the public state entry point for session + access context.
 */
@Injectable({ providedIn: 'root' })
export class AccessContextStore {
  private readonly service = inject(AccessContextService);
  private readonly appReset = inject(AppResetService);

  readonly context = signal<AccessContext | null>(null);
  readonly status = signal<AccessContextStatus>('idle');
  readonly error = signal<string | null>(null);

  readonly isSuperAdmin = () => this.context()?.is_super_admin ?? false;
  readonly tenantId = () => this.context()?.tenant_id ?? null;
  readonly tenantRole = () => this.context()?.tenant_role ?? null;
  readonly tenantStatus = () => this.context()?.tenant_status ?? null;
  readonly allowedTenants = () => this.context()?.allowed_tenants ?? [];
  readonly activeTenant = () => {
    const ctx = this.context();
    if (!ctx?.tenant_id) return null;
    const t = ctx.allowed_tenants.find((a) => a.id === ctx.tenant_id);
    return t ? { ...t, role: ctx.tenant_role } : null;
  };

  readonly needsTenantSelection = () => {
    const ctx = this.context();
    if (!ctx || this.status() !== 'ready') return false;
    return (
      ctx.tenant_id === null &&
      ctx.allowed_tenants.length > 1 &&
      (ctx.is_super_admin || ctx.allowed_tenants.length > 1)
    );
  };

  readonly hasNoTenants = () => {
    const ctx = this.context();
    return (
      this.status() === 'ready' &&
      ctx !== null &&
      ctx.allowed_tenants.length === 0 &&
      !ctx.is_super_admin
    );
  };

  private static readonly LOAD_TIMEOUT_MS = 20_000;

  /** Evita varias llamadas RPC en paralelo con el mismo tenant (bootstrap + guards). */
  private loadInflight: Promise<void> | null = null;
  private loadInflightKey: string | null = null;

  /**
   * Load access context. Call with no args at bootstrap; pass tenantId when user selects a tenant.
   */
  async load(tenantId?: string | null): Promise<void> {
    const key = tenantId ?? '';
    if (this.loadInflight && this.loadInflightKey === key) {
      logBootstrap('AccessContextStore.load skipped (already in flight)', { tenantId: key || null });
      return this.loadInflight;
    }
    this.loadInflightKey = key;
    this.loadInflight = this.runLoad(tenantId).finally(() => {
      this.loadInflight = null;
      this.loadInflightKey = null;
    });
    return this.loadInflight;
  }

  private async runLoad(tenantId?: string | null): Promise<void> {
    logBootstrap('AccessContextStore.load start', { tenantId: tenantId ?? null });
    this.status.set('loading');
    this.error.set(null);
    try {
      const ctx = await Promise.race([
        this.service.getAccessContext(tenantId),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('get_access_context timed out')),
            AccessContextStore.LOAD_TIMEOUT_MS
          )
        ),
      ]);
      this.context.set(ctx);
      this.status.set('ready');
      logBootstrap('AccessContextStore.load ok', {
        is_super_admin: ctx.is_super_admin,
        tenant_id: ctx.tenant_id,
        allowedTenantsCount: ctx.allowed_tenants?.length ?? 0,
      });
    } catch (e) {
      const message = e && typeof e === 'object' && 'message' in e
        ? String((e as { message: unknown }).message)
        : 'Failed to load access context';
      logBootstrapWarn('AccessContextStore.load error', message, e);
      this.error.set(message);
      this.context.set(null);
      this.status.set('error');
      throw e;
    }
  }

  /** Select tenant and reload context. Triggers app reset. */
  async selectTenant(tenantId: string): Promise<void> {
    await this.load(tenantId);
    this.appReset.resetAll();
  }

  /** Reset to idle (e.g. on sign out). */
  reset(): void {
    this.context.set(null);
    this.status.set('idle');
    this.error.set(null);
  }
}
