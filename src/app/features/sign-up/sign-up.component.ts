import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { AuthService } from '../../core/auth/auth.service';
import {
  buildMagicLinkRedirectUrl,
  clearPostAuthRedirect,
  persistPostAuthRedirect,
  resolvePostAuthRedirect,
} from '../../core/auth/post-auth-redirect';
import {
  markInvitationAuthReady,
  parseInvitationTokenFromUrl,
} from '../../core/auth/invitation-auth';
import { SessionStore } from '../../core/auth/session.store';

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
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    effect(() => {
      if (this.sessionStore.session()) {
        void this.navigateAfterAuth();
      }
    });
  }

  readonly success = signal(false);
  readonly error = signal<NormalizedError | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly returnUrl = () =>
    resolvePostAuthRedirect(this.route.snapshot.queryParamMap.get('returnUrl'));

  readonly loginQueryParams = (): { returnUrl?: string } => {
    const url = this.returnUrl();
    return url === '/' ? {} : { returnUrl: url };
  };

  private async navigateAfterAuth(): Promise<void> {
    const destination = this.returnUrl();
    const inviteToken = parseInvitationTokenFromUrl(destination);
    if (inviteToken) {
      markInvitationAuthReady(inviteToken);
    }
    clearPostAuthRedirect();
    await this.router.navigateByUrl(destination);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    this.success.set(false);
    const email = this.form.getRawValue().email;
    const destination = this.returnUrl();
    persistPostAuthRedirect(destination);
    const result = await this.authService.signUpWithMagicLink(
      email,
      buildMagicLinkRedirectUrl(this.route.snapshot.queryParamMap.get('returnUrl'))
    );
    if (result.error) {
      this.error.set(result.error);
      return;
    }
    this.success.set(true);
  }
}
