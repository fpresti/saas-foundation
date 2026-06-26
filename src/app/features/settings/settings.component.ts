import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { SessionStore } from '../../core/auth/session.store';
import { SettingsStore } from './settings.store';

@Component({
  selector: 'app-settings',
  standalone: true,
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
}
