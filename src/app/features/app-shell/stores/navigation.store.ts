import { computed, inject, Injectable, signal } from '@angular/core';
import { SessionStore } from '../../../core/auth/session.store';
import { PermissionService } from '../../../core/auth/permission.service';
import { AppResetService } from '../../../core/services/app-reset.service';
import { NavigationService } from '../services/navigation.service';
import type { NavSection } from '../types';

@Injectable({ providedIn: 'root' })
export class NavigationStore {
  private readonly navigationService = inject(NavigationService);
  private readonly sessionStore = inject(SessionStore);
  private readonly permissionService = inject(PermissionService);
  private readonly appReset = inject(AppResetService);

  private readonly navPermissions = signal<Record<string, boolean>>({});

  constructor() {
    this.appReset.registerResettable('navigation', this);
  }

  /** Reload nav permission flags when tenant or session changes. */
  async refreshNavPermissions(): Promise<void> {
    const tenantId = this.sessionStore.activeTenantId();
    if (!tenantId || !this.sessionStore.isAuthenticated()) {
      this.navPermissions.set({});
      return;
    }
    const codes = [
      ...new Set(
        this.navigationService
          .getSections()
          .flatMap((s) => s.items)
          .map((i) => i.permission)
          .filter((c): c is string => !!c)
      ),
    ];
    const entries = await Promise.all(
      codes.map(async (code) => [code, await this.permissionService.hasPermission(code)] as const)
    );
    this.navPermissions.set(Object.fromEntries(entries));
  }

  readonly sections = computed<readonly NavSection[]>(() => {
    const perms = this.navPermissions();
    const base = this.navigationService.getSections();
    const canShowSwitchTenant =
      this.sessionStore.isSuperAdmin() &&
      this.sessionStore.allowedTenants().length > 1;

    const filtered = base.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.disabled) return false;
        if (!item.permission) return true;
        return perms[item.permission] === true;
      }),
    }));

    if (canShowSwitchTenant) return filtered;
    return filtered.map((section) => {
      if (section.id === 'main') {
        return {
          ...section,
          items: section.items.filter((item) => item.routerLink !== '/select-tenant'),
        };
      }
      return section;
    });
  });

  readonly collapsedBySection = signal<Record<string, boolean>>({});

  toggleSectionCollapsed(sectionId: string): void {
    this.collapsedBySection.update((map) => ({
      ...map,
      [sectionId]: !map[sectionId],
    }));
  }

  isSectionCollapsed(sectionId: string): boolean {
    return Boolean(this.collapsedBySection()[sectionId]);
  }

  reset(): void {
    this.collapsedBySection.set({});
    this.navPermissions.set({});
  }

  readonly railItems = computed(() => this.sections().flatMap((s) => s.items));
}
