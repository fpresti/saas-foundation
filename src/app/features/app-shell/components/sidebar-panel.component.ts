import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavIconComponent } from './nav-icon.component';
import { SidebarHeaderComponent } from './sidebar-header.component';
import { LayoutUiStore } from '../stores/layout-ui.store';
import { NavigationStore } from '../stores/navigation.store';

@Component({
  selector: 'app-sidebar-panel',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NavIconComponent, SidebarHeaderComponent],
  templateUrl: './sidebar-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
})
export class SidebarPanelComponent {
  readonly showCloseButton = input<boolean>(false);
  protected readonly navStore = inject(NavigationStore);
  protected readonly layoutStore = inject(LayoutUiStore);
}
