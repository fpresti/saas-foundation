import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TenantStore } from '../tenant/tenant.store';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly authStore = inject(AuthStore);
  private readonly tenantStore = inject(TenantStore);
  private readonly router = inject(Router);

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
