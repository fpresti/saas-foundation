import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings-placeholder',
  standalone: true,
  template: '<p class="text-[var(--color-text-primary)]">Settings (placeholder)</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPlaceholderComponent {}
