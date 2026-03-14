import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { AccessContextStore } from '../../features/access-context';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly authStore = inject(AuthStore);
  private readonly accessContextStore = inject(AccessContextStore);
  private readonly router = inject(Router);

  readonly userName = computed(
    () => this.authStore.session()?.user?.email ?? '—'
  );

  readonly activeTenantName = computed(
    () => this.accessContextStore.activeTenant()?.name ?? '—'
  );

  readonly canSwitchTenant = computed(
    () => this.accessContextStore.allowedTenants().length > 1
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
