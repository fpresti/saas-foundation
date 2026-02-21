import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar-panel',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarPanelComponent {}
