import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutUiStore } from '../stores/layout-ui.store';

@Component({
  selector: 'app-sidebar-rail',
  standalone: true,
  templateUrl: './sidebar-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarRailComponent {
  protected readonly layoutStore = inject(LayoutUiStore);
}
