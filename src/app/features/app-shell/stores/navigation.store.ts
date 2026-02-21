import { computed, inject, Injectable, signal } from '@angular/core';
import { TenantStore } from '../../../core/tenant/tenant.store';
import { NavigationService } from '../services/navigation.service';
import type { NavSection } from '../types';

@Injectable({ providedIn: 'root' })
export class NavigationStore {
  private readonly navigationService = inject(NavigationService);
  private readonly tenantStore = inject(TenantStore);

  /** All navigation sections (Switch tenant only for super_admin with >1 tenant) */
  readonly sections = computed<readonly NavSection[]>(() => {
    const base = this.navigationService.getSections();
    const canShowSwitchTenant =
      this.tenantStore.platformRole() === 'super_admin' &&
      this.tenantStore.availableTenants().length > 1;
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

  /** Flattened nav items for rail (icon-only) */
  readonly railItems = computed(() =>
    this.sections().flatMap((s) => s.items)
  );
}
