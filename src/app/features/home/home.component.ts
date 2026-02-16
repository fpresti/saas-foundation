import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);

  async signOut(): Promise<void> {
    this.authStore.mockSignOut();
    await this.router.navigateByUrl('/login');
  }
}
