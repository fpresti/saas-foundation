import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  template: `
    <div
      class="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"
      [class.size-8]="size() === 'sm'"
      [class.text-xs]="size() === 'sm'"
      [class.size-10]="size() !== 'sm'"
      [class.text-sm]="size() !== 'sm'"
      aria-hidden="true"
    >
      @if (src(); as url) {
        <img [src]="url" alt="" class="h-full w-full object-cover" />
      } @else {
        <span class="font-medium leading-none">{{ initialsLabel() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarComponent {
  readonly src = input<string | null>(null);
  readonly initials = input<string | null>('?');
  readonly size = input<'sm' | 'md'>('md');

  initialsLabel(): string {
    return this.initials()?.trim() || '?';
  }
}
