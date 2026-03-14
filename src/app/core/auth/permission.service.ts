import { inject, Injectable, signal } from '@angular/core';
import { AccessContextService } from './access-context.service';
import { SessionStore } from './session.store';

/**
 * Tenant-scoped permission checks with in-memory cache (key: tenantId + permissionCode).
 * Delegates to backend `has_permission` RPC; does not infer roles on the client.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly sessionStore = inject(SessionStore);
  private readonly accessContext = inject(AccessContextService);

  /** Cache: key → allowed. Keys are `${tenantId}\u001f${permissionCode}`. */
  private readonly cache = signal<Record<string, boolean>>({});

  private static cacheKey(tenantId: string, permissionCode: string): string {
    return `${tenantId}\u001f${permissionCode}`;
  }

  /**
   * Whether the current user has the permission in the active tenant.
   * No session or no active tenant → false (no throw). RPC errors → false.
   */
  async hasPermission(permissionCode: string): Promise<boolean> {
    const code =
      typeof permissionCode === 'string' && permissionCode.trim().length > 0
        ? permissionCode.trim()
        : '';
    if (!code) {
      return false;
    }

    if (!this.sessionStore.isAuthenticated()) {
      return false;
    }

    await this.sessionStore.ensureAccessContextReady();

    const tenantId = this.sessionStore.activeTenantId();
    if (!tenantId) {
      return false;
    }

    const key = PermissionService.cacheKey(tenantId, code);
    const snapshot = this.cache();
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      return snapshot[key]!;
    }

    let allowed = false;
    try {
      allowed = await this.accessContext.hasPermission(tenantId, code);
    } catch {
      allowed = false;
    }

    this.cache.update((m) => ({ ...m, [key]: allowed }));
    return allowed;
  }

  /** Drop all cached permission results (e.g. logout). */
  clearCache(): void {
    this.cache.set({});
  }
}
