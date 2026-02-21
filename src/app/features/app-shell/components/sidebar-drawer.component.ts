import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SidebarPanelComponent } from './sidebar-panel.component';
import { filter } from 'rxjs';
import { LayoutUiStore } from '../stores/layout-ui.store';

@Component({
  selector: 'app-sidebar-drawer',
  standalone: true,
  imports: [SidebarPanelComponent],
  templateUrl: './sidebar-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDrawerComponent {
  protected readonly layoutStore = inject(LayoutUiStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.layoutStore.closeDrawer());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.layoutStore.isDrawerOpen()) {
      this.layoutStore.closeDrawer();
    }
  }

  onBackdropClick(): void {
    this.layoutStore.closeDrawer();
  }

  onPanelClick(event: Event): void {
    event.stopPropagation();
  }
}
