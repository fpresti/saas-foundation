import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);

  async mockSignIn(): Promise<void> {
    this.authStore.mockSignIn();
    await this.router.navigateByUrl('/');
  }
}
