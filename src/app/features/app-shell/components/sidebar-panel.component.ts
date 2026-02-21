import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavIconComponent } from './nav-icon.component';
import { SidebarHeaderComponent } from './sidebar-header.component';
import { NavigationStore } from '../stores/navigation.store';

@Component({
  selector: 'app-sidebar-panel',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NavIconComponent, SidebarHeaderComponent],
  templateUrl: './sidebar-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarPanelComponent {
  readonly showCloseButton = input<boolean>(false);
  protected readonly navStore = inject(NavigationStore);
}
