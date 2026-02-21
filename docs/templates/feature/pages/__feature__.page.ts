import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { __Feature__Store } from '../stores/__feature__.store';
import { __Feature__CardComponent } from '../components/__feature__-card.component';

@Component({
  selector: 'app-__feature__-page',
  standalone: true,
  imports: [__Feature__CardComponent],
  templateUrl: './__feature__.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class __Feature__PageComponent implements OnInit {
  protected readonly store = inject(__Feature__Store);

  /** Call load on init or via user action. */
  ngOnInit(): void {
    void this.store.load();
  }
}
