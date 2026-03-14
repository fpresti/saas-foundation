import { inject, Injectable, signal } from '@angular/core';
import { AccessContextService } from '../services/access-context.service';
import type { AccessContext, AccessContextStatus } from '../types';
import { AppResetService } from '../../../core/services/app-reset.service';

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

  /**
   * Load access context. Call with no args at bootstrap; pass tenantId when user selects a tenant.
   */
  async load(tenantId?: string | null): Promise<void> {
    this.status.set('loading');
    this.error.set(null);
    try {
      const ctx = await this.service.getAccessContext(tenantId);
      this.context.set(ctx);
      this.status.set('ready');
    } catch (e) {
      const message = e && typeof e === 'object' && 'message' in e
        ? String((e as { message: unknown }).message)
        : 'Failed to load access context';
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
