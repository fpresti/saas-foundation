import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { __Feature__Item } from '../types';

@Component({
  selector: 'app-__feature__-card',
  standalone: true,
  templateUrl: './__feature__-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class __Feature__CardComponent {
  readonly item = input.required<__Feature__Item>();
}
