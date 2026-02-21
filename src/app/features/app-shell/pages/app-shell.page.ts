import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarDrawerComponent } from '../components/sidebar-drawer.component';
import { SidebarPanelComponent } from '../components/sidebar-panel.component';
import { SidebarRailComponent } from '../components/sidebar-rail.component';
import { LayoutUiStore } from '../stores/layout-ui.store';

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
}
