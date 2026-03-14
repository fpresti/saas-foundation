import { Injectable } from '@angular/core';

export type Resettable = { reset(): void };

/**
 * Central service for tenant-change reset. Registers stores and caches
 * that must be reset/invalidated when the user switches tenant.
 *
 * On tenant change: call resetAll() then layoutUi.closeDrawer().
 */
@Injectable({ providedIn: 'root' })
export class AppResetService {
  private readonly resettables = new Map<string, () => void>();

  /** Register a store or cache by key and reset callback. */
  register(key: string, fn: () => void): void {
    this.resettables.set(key, fn);
  }

  /** Register an object with a reset() method. */
  registerResettable(key: string, store: Resettable): void {
    this.register(key, () => store.reset());
  }

  /** Reset all registered stores/caches. Caller must also close drawer. */
  resetAll(): void {
    for (const fn of this.resettables.values()) {
      try {
        fn();
      } catch (e) {
        console.error('[AppResetService] Reset failed:', e);
      }
    }
  }
}
