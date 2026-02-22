import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationService } from '../services/navigation.service';
import type { NavSection } from '../types';

@Injectable({ providedIn: 'root' })
export class NavigationStore {
  private readonly navigationService = inject(NavigationService);

  /** All navigation sections */
  readonly sections = signal<readonly NavSection[]>(
    this.navigationService.getSections()
  );

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
