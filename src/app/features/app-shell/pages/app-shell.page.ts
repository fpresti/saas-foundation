import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarDrawerComponent } from '../components/sidebar-drawer.component';
import { SidebarPanelComponent } from '../components/sidebar-panel.component';
import { TopbarComponent } from '../components/topbar.component';

@Component({
  selector: 'app-app-shell-page',
  standalone: true,
  imports: [
    RouterOutlet,
    TopbarComponent,
    SidebarPanelComponent,
    SidebarDrawerComponent,
  ],
  templateUrl: './app-shell.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellPageComponent {}
