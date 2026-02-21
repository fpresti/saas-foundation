import { computed, inject, Injectable, signal } from '@angular/core';
import { NormalizedError } from '../utils/supabase-error.util';
import { AuthStore } from '../auth/auth.store';
import { AppResetService } from '../services/app-reset.service';
import { Tenant } from './tenant.types';
import { TenantService } from './tenant.service';

const ACTIVE_TENANT_STORAGE_KEY = 'saas-foundation-active-tenant-id';

@Injectable({ providedIn: 'root' })
export class TenantStore {
  private readonly authStore = inject(AuthStore);
  private readonly tenantService = inject(TenantService);
  private readonly appReset = inject(AppResetService);

  readonly availableTenants = signal<Tenant[]>([]);
  readonly activeTenant = signal<Tenant | null>(null);
  readonly platformRole = signal<'super_admin' | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<NormalizedError | null>(null);

  readonly needsTenantSelection = computed(
    () =>
      !this.isLoading() &&
      this.activeTenant() === null &&
      this.availableTenants().length > 1
  );

  readonly hasNoTenants = computed(
    () =>
      !this.isLoading() &&
      this.authStore.isAuthenticated() &&
      this.availableTenants().length === 0
  );


  /** Call after auth is resolved. Loads tenants and resolves active tenant. */
  async initialize(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      if (!this.authStore.isAuthenticated()) {
        this.availableTenants.set([]);
        this.activeTenant.set(null);
        this.platformRole.set(null);
        return;
      }

      const platformRole = await this.tenantService.getMyPlatformRole();
      this.platformRole.set(platformRole);
      let tenants: Tenant[];

      if (platformRole === 'super_admin') {
        tenants = await this.tenantService.getAllTenantsForSuperAdmin();
      } else {
        tenants = await this.tenantService.getMyMembershipTenants();
      }

      this.availableTenants.set(tenants);

      const storedId = this.getStoredActiveTenantId();
      const storedTenant = storedId
        ? tenants.find((t) => t.id === storedId)
        : null;

      // Super_admin always goes through tenant selection (no auto-select)
      if (platformRole === 'super_admin') {
        if (storedTenant) {
          this.activeTenant.set(storedTenant);
          this.setStoredActiveTenantId(storedTenant.id);
        } else {
          this.activeTenant.set(null);
          this.clearStoredActiveTenantId();
        }
        return;
      }

      if (storedTenant) {
        this.activeTenant.set(storedTenant);
        this.setStoredActiveTenantId(storedTenant.id);
      } else if (tenants.length === 1) {
        const single = tenants[0];
        this.activeTenant.set(single);
        this.setStoredActiveTenantId(single.id);
      } else {
        this.activeTenant.set(null);
        this.clearStoredActiveTenantId();
      }
    } catch (e) {
      const normalized =
        e && typeof e === 'object' && 'code' in e && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Failed to load tenants' };
      this.error.set(normalized);
      this.availableTenants.set([]);
      this.activeTenant.set(null);
      this.platformRole.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  setActiveTenant(tenantId: string): void {
    const tenant = this.availableTenants().find((t) => t.id === tenantId);
    if (tenant) {
      this.activeTenant.set(tenant);
      this.setStoredActiveTenantId(tenantId);
      this.appReset.resetAll();
    }
  }

  clearActiveTenant(): void {
    this.activeTenant.set(null);
    this.clearStoredActiveTenantId();
  }

  private getStoredActiveTenantId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private setStoredActiveTenantId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }

  private clearStoredActiveTenantId(): void {
    try {
      localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
