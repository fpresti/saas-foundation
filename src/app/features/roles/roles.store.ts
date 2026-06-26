import { computed, inject, Injectable, signal } from '@angular/core';
import { AppResetService } from '../../core/services/app-reset.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { RolesService } from './roles.service';
import type { TenantRoleItem } from './types';

@Injectable({ providedIn: 'root' })
export class RolesStore {
  private readonly rolesService = inject(RolesService);
  private readonly appReset = inject(AppResetService);

  readonly state = signal<TenantRoleItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly roles = computed(() => this.state());

  constructor() {
    this.appReset.registerResettable('roles', this);
  }

  reset(): void {
    this.state.set([]);
    this.error.set(null);
  }

  async load(tenantId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      this.state.set(await this.rolesService.listForTenant(tenantId));
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Could not load roles.' };
      this.error.set(normalized);
      this.state.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
