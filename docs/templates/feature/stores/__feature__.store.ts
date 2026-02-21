import { computed, inject, Injectable, signal } from '@angular/core';
import type { NormalizedError } from '../../../../src/app/core/utils/supabase-error.util';
import { __Feature__Service } from '../services/__feature__.service';
import type { __Feature__Item } from '../types';

@Injectable({ providedIn: 'root' })
export class __Feature__Store {
  private readonly __featureCamel__Service = inject(__Feature__Service);

  readonly state = signal<__Feature__Item[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<NormalizedError | null>(null);

  readonly items = computed(() => this.state());
  readonly hasItems = computed(() => this.state().length > 0);

  /** Load data via service. Components call this; never call Supabase from components. */
  async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const data = await this.__featureCamel__Service.list();
      this.state.set(data);
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'code' in e && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Failed to load' };
      this.error.set(normalized);
      this.state.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
