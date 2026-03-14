import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { LayoutUiStore } from '../stores/layout-ui.store';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  protected readonly layoutStore = inject(LayoutUiStore);
  protected readonly sessionStore = inject(SessionStore);
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
