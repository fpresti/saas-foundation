import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutUiStore } from '../stores/layout-ui.store';
import { SidebarDrawerComponent } from '../components/sidebar-drawer.component';
import { SidebarPanelComponent } from '../components/sidebar-panel.component';

@Component({
  selector: 'app-app-shell-page',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarPanelComponent,
    SidebarDrawerComponent,
  ],
  templateUrl: './app-shell.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellPageComponent {
  protected readonly layoutStore = inject(LayoutUiStore);
}
