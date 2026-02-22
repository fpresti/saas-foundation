import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { AccessContextStore } from '../../access-context';
import { NavIconComponent } from './nav-icon.component';
import { LayoutUiStore } from '../stores/layout-ui.store';

@Component({
  selector: 'app-sidebar-header',
  standalone: true,
  imports: [NavIconComponent],
  templateUrl: './sidebar-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarHeaderComponent {
  readonly showCloseButton = input<boolean>(false);
  protected readonly authStore = inject(AuthStore);
  protected readonly layoutStore = inject(LayoutUiStore);
  protected readonly accessContextStore = inject(AccessContextStore);
  private readonly router = inject(Router);

  readonly userName = computed(
    () => this.authStore.session()?.user?.email ?? '—'
  );
  readonly activeTenantName = computed(
    () => this.accessContextStore.activeTenant()?.name ?? '—'
  );
  readonly canSwitchTenant = computed(
    () =>
      this.accessContextStore.isSuperAdmin() &&
      this.accessContextStore.allowedTenants().length > 1
  );
  readonly hasActiveTenant = computed(
    () => this.accessContextStore.activeTenant() !== null
  );

  async signOut(): Promise<void> {
    await this.authStore.signOut();
    await this.router.navigateByUrl('/login');
  }

  async switchTenant(): Promise<void> {
    await this.router.navigateByUrl('/select-tenant');
  }
}
