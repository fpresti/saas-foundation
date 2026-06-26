import { Component, ChangeDetectionStrategy, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session.store';

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
  readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    effect(() => {
      if (this.sessionStore.session()) {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl || '/');
      }
    });
  }

  readonly mode = signal<'magic' | 'password'>('magic');
  readonly magicSuccess = signal(false);
  readonly magicError = signal<NormalizedError | null>(null);

  readonly magicForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  setMode(m: 'magic' | 'password'): void {
    this.mode.set(m);
    this.magicSuccess.set(false);
    this.magicError.set(null);
  }

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

  async signInWithPassword(): Promise<void> {
    if (this.form.invalid) return;
    const ok = await this.sessionStore.signIn(
      this.form.getRawValue().email,
      this.form.getRawValue().password
    );
    if (ok) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl || '/');
    }
  }
}
