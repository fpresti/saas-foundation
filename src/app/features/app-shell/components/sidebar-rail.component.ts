import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';
import { NavIconComponent } from './nav-icon.component';
import { UserAvatarComponent } from './user-avatar.component';
import { LayoutUiStore } from '../stores/layout-ui.store';
import { NavigationStore } from '../stores/navigation.store';

@Component({
  selector: 'app-sidebar-rail',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NavIconComponent, UserAvatarComponent],
  templateUrl: './sidebar-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
})
export class SidebarRailComponent implements OnInit {
  protected readonly layoutStore = inject(LayoutUiStore);
  protected readonly navStore = inject(NavigationStore);
  protected readonly profileStore = inject(CurrentProfileStore);

  readonly profileLabel = computed(() => {
    const name = this.profileStore.displayName();
    return name || 'User profile';
  });

  ngOnInit(): void {
    void this.profileStore.ensureLoaded();
  }
}
