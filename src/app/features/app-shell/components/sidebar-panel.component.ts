import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarHeaderComponent } from './sidebar-header.component';

@Component({
  selector: 'app-sidebar-panel',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SidebarHeaderComponent],
  templateUrl: './sidebar-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarPanelComponent {
  readonly showCloseButton = input<boolean>(false);
}
