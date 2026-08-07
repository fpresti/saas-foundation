import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';
import { UserAvatarComponent } from './user-avatar.component';
import { LayoutUiStore } from '../stores/layout-ui.store';

@Component({
  selector: 'app-sidebar-header',
  standalone: true,
  imports: [UserAvatarComponent],
  templateUrl: './sidebar-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarHeaderComponent implements OnInit {
  readonly showCloseButton = input<boolean>(false);
  protected readonly sessionStore = inject(SessionStore);
  protected readonly layoutStore = inject(LayoutUiStore);
  protected readonly profileStore = inject(CurrentProfileStore);
  private readonly router = inject(Router);

  readonly displayName = computed(() => this.profileStore.displayName() || '—');
  readonly activeTenantName = computed(
    () => this.sessionStore.activeTenant()?.name ?? '—'
  );
  readonly canSwitchTenant = computed(
    () =>
      this.sessionStore.isSuperAdmin() &&
      this.sessionStore.allowedTenants().length > 1
  );
  readonly hasActiveTenant = computed(
    () => this.sessionStore.activeTenant() !== null
  );

  ngOnInit(): void {
    void this.profileStore.ensureLoaded();
  }

  async signOut(): Promise<void> {
    await this.sessionStore.signOut();
    await this.router.navigateByUrl('/login');
  }

  async switchTenant(): Promise<void> {
    await this.router.navigateByUrl('/select-tenant');
  }
}
