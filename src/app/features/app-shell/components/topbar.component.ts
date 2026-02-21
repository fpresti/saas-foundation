import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { LayoutUiStore } from '../stores/layout-ui.store';
import { TenantStore } from '../../../core/tenant/tenant.store';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  protected readonly layoutStore = inject(LayoutUiStore);
  protected readonly authStore = inject(AuthStore);
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
