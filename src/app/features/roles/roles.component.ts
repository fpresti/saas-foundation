import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { SessionStore } from '../../core/auth/session.store';
import { RolesStore } from './roles.store';

@Component({
  selector: 'app-roles',
  standalone: true,
  templateUrl: './roles.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesComponent {
  readonly session = inject(SessionStore);
  readonly store = inject(RolesStore);

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
