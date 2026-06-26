import { computed, inject, Injectable, signal } from '@angular/core';
import { AppResetService } from '../../core/services/app-reset.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { HomeService, type HomeSummary } from './home.service';

@Injectable({ providedIn: 'root' })
export class HomeStore {
  private readonly homeService = inject(HomeService);
  private readonly appReset = inject(AppResetService);

  readonly summary = signal<HomeSummary | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly hasSummary = computed(() => this.summary() !== null);

  constructor() {
    this.appReset.registerResettable('home', this);
  }

  reset(): void {
    this.summary.set(null);
    this.error.set(null);
  }

  async load(tenantId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      this.summary.set(await this.homeService.loadSummary(tenantId));
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Could not load dashboard.' };
      this.error.set(normalized);
      this.summary.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
