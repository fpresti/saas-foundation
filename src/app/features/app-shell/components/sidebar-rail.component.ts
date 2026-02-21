import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavIconComponent } from './nav-icon.component';
import { LayoutUiStore } from '../stores/layout-ui.store';
import { NavigationStore } from '../stores/navigation.store';

@Component({
  selector: 'app-sidebar-rail',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NavIconComponent],
  templateUrl: './sidebar-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarRailComponent {
  protected readonly layoutStore = inject(LayoutUiStore);
  protected readonly navStore = inject(NavigationStore);
}
