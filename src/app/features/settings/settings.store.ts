import { computed, inject, Injectable, signal } from '@angular/core';
import { AppResetService } from '../../core/services/app-reset.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { SettingsService, type TenantSettings } from './settings.service';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly settingsService = inject(SettingsService);
  private readonly appReset = inject(AppResetService);

  readonly tenant = signal<TenantSettings | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly hasTenant = computed(() => this.tenant() !== null);

  constructor() {
    this.appReset.registerResettable('settings', this);
  }

  reset(): void {
    this.tenant.set(null);
    this.error.set(null);
  }

  async load(tenantId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      this.tenant.set(await this.settingsService.getTenant(tenantId));
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Could not load settings.' };
      this.error.set(normalized);
      this.tenant.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
