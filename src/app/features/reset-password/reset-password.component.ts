import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

const MIN_PASSWORD_LENGTH = 6;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule]
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', Validators.required]
    },
    {
      validators: (group) => {
        const password = group.get('password')?.value ?? '';
        const confirm = group.get('confirmPassword')?.value ?? '';
        return password === confirm ? null : { passwordMismatch: true };
      }
    }
  );

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    const result = await this.authService.updatePassword(
      this.form.getRawValue().password
    );

    this.loading.set(false);
    if (result.error) {
      this.errorMessage.set(result.error.message);
      return;
    }
    await this.router.navigateByUrl('/login');
  }
}
