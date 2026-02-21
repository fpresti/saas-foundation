import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutUiStore {
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
}
