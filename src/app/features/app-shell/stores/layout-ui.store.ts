import { inject, Injectable, signal } from '@angular/core';
import { AppResetService } from '../../../core/services/app-reset.service';

@Injectable({ providedIn: 'root' })
export class LayoutUiStore {
  private readonly appReset = inject(AppResetService);

  constructor() {
    this.appReset.registerResettable('layout-ui', this);
  }
  readonly isDrawerOpen = signal<boolean>(false);

  /** Desktop sidebar: false = rail (icons only), true = panel (labels) */
  readonly isSidebarExpanded = signal<boolean>(false);

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((v) => !v);
  }

  toggleSidebar(): void {
    this.isSidebarExpanded.update((v) => !v);
  }

  /** Reset UI state on tenant change (close drawer). */
  reset(): void {
    this.closeDrawer();
  }
}
