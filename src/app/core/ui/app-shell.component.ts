import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionStore } from '../auth/session.store';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  readonly userName = computed(
    () => this.sessionStore.session()?.user?.email ?? '—'
  );

  readonly activeTenantName = computed(
    () => this.sessionStore.activeTenant()?.name ?? '—'
  );

  readonly canSwitchTenant = computed(
    () => this.sessionStore.allowedTenants().length > 1
  );

  readonly hasActiveTenant = computed(
    () => this.sessionStore.activeTenant() !== null
  );

  async signOut(): Promise<void> {
    await this.sessionStore.signOut();
    await this.router.navigateByUrl('/login');
  }

  async switchTenant(): Promise<void> {
    await this.router.navigateByUrl('/select-tenant');
  }
}
