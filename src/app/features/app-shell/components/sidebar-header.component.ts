import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { TenantStore } from '../../../core/tenant/tenant.store';
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
  protected readonly tenantStore = inject(TenantStore);
  private readonly router = inject(Router);

  readonly userName = computed(
    () => this.authStore.session()?.user?.email ?? '—'
  );
  readonly activeTenantName = computed(
    () => this.tenantStore.activeTenant()?.name ?? '—'
  );
  readonly canSwitchTenant = computed(
    () => this.tenantStore.availableTenants().length > 1
  );
  readonly hasActiveTenant = computed(
    () => this.tenantStore.activeTenant() !== null
  );

  async signOut(): Promise<void> {
    await this.authStore.signOut();
    await this.router.navigateByUrl('/login');
  }

  async switchTenant(): Promise<void> {
    await this.router.navigateByUrl('/select-tenant');
  }
}
