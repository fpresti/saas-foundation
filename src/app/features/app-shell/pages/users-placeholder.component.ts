import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-users-placeholder',
  standalone: true,
  template: '<p class="text-[var(--color-text-primary)]">Users (placeholder)</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPlaceholderComponent {}
