import { computed, inject, Injectable, signal } from '@angular/core';
import { SessionStore } from '../../../core/auth/session.store';
import { AppResetService } from '../../../core/services/app-reset.service';
import { NavigationService } from '../services/navigation.service';
import type { NavSection } from '../types';

@Injectable({ providedIn: 'root' })
export class NavigationStore {
  private readonly navigationService = inject(NavigationService);
  private readonly sessionStore = inject(SessionStore);
  private readonly appReset = inject(AppResetService);

  constructor() {
    this.appReset.registerResettable('navigation', this);
  }

  /** All navigation sections (Switch tenant only for super_admin with >1 tenant) */
  readonly sections = computed<readonly NavSection[]>(() => {
    const base = this.navigationService.getSections();
    const canShowSwitchTenant =
      this.sessionStore.isSuperAdmin() &&
      this.sessionStore.allowedTenants().length > 1;
    if (canShowSwitchTenant) return base;
    return base.map((section) => {
      if (section.id === 'main') {
        return {
          ...section,
          items: section.items.filter((item) => item.routerLink !== '/select-tenant'),
        };
      }
      return section;
    });
  });

  /** Map of section id -> collapsed state */
  readonly collapsedBySection = signal<Record<string, boolean>>({});

  toggleSectionCollapsed(sectionId: string): void {
    this.collapsedBySection.update((map) => ({
      ...map,
      [sectionId]: !map[sectionId],
    }));
  }

  /** Whether section is collapsed */
  isSectionCollapsed(sectionId: string): boolean {
    return Boolean(this.collapsedBySection()[sectionId]);
  }

  /** Reset state on tenant change. */
  reset(): void {
    this.collapsedBySection.set({});
  }

  /** Flattened nav items for rail (icon-only) */
  readonly railItems = computed(() =>
    this.sections().flatMap((s) => s.items)
  );
}
