import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

/** Mock tenant shape. Replace when integrating with backend. */
export type Tenant = { id: string; name: string } | null;

@Injectable({ providedIn: 'root' })
export class TenantStore {
  private readonly authStore = inject(AuthStore);

  readonly currentTenant = signal<Tenant>(null);
  readonly isLoading = signal<boolean>(true);

  readonly isTenantReady = computed(
    () => !this.isLoading() && this.currentTenant() !== null
  );

  /** Load tenant context (mock). Depends on auth; call after auth is resolved. */
  async initialize(): Promise<void> {
    this.isLoading.set(true);
    try {
      const tenant = await this.mockGetTenant();
      this.currentTenant.set(tenant);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Mock: no real backend. Returns a default tenant when authenticated. */
  private async mockGetTenant(): Promise<Tenant> {
    await new Promise((r) => setTimeout(r, 80));
    if (this.authStore.isAuthenticated()) {
      return { id: 'mock-tenant-1', name: 'Mock Tenant' };
    }
    return null;
  }
}
