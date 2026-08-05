import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionStore } from '../../core/auth/session.store';
import { SettingsStore } from './settings.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  readonly session = inject(SessionStore);
  readonly store = inject(SettingsStore);

  constructor() {
    effect(() => {
      const tenantId = this.session.activeTenantId();
      if (!tenantId) {
        untracked(() => this.store.reset());
        return;
      }
      void this.store.load(tenantId);
    });
  }

  changePlan(): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.changePlan(tenantId);
  }

  openPortal(): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.openBillingPortal(tenantId);
  }

  setupBilling(): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.setupBilling(tenantId);
  }
}
