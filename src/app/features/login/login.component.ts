import { Component, ChangeDetectionStrategy, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.authStore.session()) {
        this.router.navigateByUrl('/');
      }
    });
  }

  readonly magicSuccess = signal(false);
  readonly magicError = signal<NormalizedError | null>(null);

  readonly magicForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  async sendMagicLink(): Promise<void> {
    if (this.magicForm.invalid) return;
    this.magicError.set(null);
    this.magicSuccess.set(false);
    const email = this.magicForm.getRawValue().email;
    const result = await this.authService.sendMagicLink(email);
    if (result.error) {
      this.magicError.set(result.error);
      return;
    }
    this.magicSuccess.set(true);
  }
}
