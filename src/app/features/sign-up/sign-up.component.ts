import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  templateUrl: './sign-up.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink]
})
export class SignUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly success = signal(false);
  readonly error = signal<NormalizedError | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    this.success.set(false);
    const email = this.form.getRawValue().email;
    const result = await this.authService.signUpWithMagicLink(email);
    if (result.error) {
      this.error.set(result.error);
      return;
    }
    this.success.set(true);
  }
}
