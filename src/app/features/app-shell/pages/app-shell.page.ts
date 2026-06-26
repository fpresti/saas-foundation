import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { SidebarDrawerComponent } from '../components/sidebar-drawer.component';
import { SidebarPanelComponent } from '../components/sidebar-panel.component';
import { SidebarRailComponent } from '../components/sidebar-rail.component';
import { LayoutUiStore } from '../stores/layout-ui.store';
import { NavigationStore } from '../stores/navigation.store';

@Component({
  selector: 'app-app-shell-page',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarPanelComponent,
    SidebarRailComponent,
    SidebarDrawerComponent,
  ],
  templateUrl: './app-shell.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellPageComponent {
  protected readonly layoutStore = inject(LayoutUiStore);
  private readonly navigationStore = inject(NavigationStore);
  private readonly sessionStore = inject(SessionStore);

  constructor() {
    effect(() => {
      const tenantId = this.sessionStore.activeTenantId();
      const ready = this.sessionStore.accessContextStatus() === 'ready';
      if (!tenantId || !ready) return;
      untracked(() => void this.navigationStore.refreshNavPermissions());
    });
  }
}
