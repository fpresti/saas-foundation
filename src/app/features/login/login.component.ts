import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
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
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private navigatedAfterAuth = false;

  constructor() {
    effect(() => {
      const session = this.sessionStore.session();
      const authLoading = this.sessionStore.authLoading();
      if (!authLoading && session && !this.navigatedAfterAuth) {
        this.navigatedAfterAuth = true;
        void this.navigateAfterAuth();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.sessionStore.waitForAuthSettled();
    await this.tryRedirectIfAuthenticated();
  }

  private async tryRedirectIfAuthenticated(): Promise<void> {
    if (this.navigatedAfterAuth || !this.sessionStore.isAuthenticated()) {
      return;
    }
    const destination = this.returnUrl();
    if (destination === '/' && !this.isInvitationFlow()) {
      return;
    }
    this.navigatedAfterAuth = true;
    await this.navigateAfterAuth();
  }

  readonly returnUrl = () =>
    resolvePostAuthRedirect(this.route.snapshot.queryParamMap.get('returnUrl'));

  readonly signUpQueryParams = (): { returnUrl?: string } => {
    const url = this.returnUrl();
    return url === '/' ? {} : { returnUrl: url };
  };

  readonly isInvitationFlow = () =>
    this.route.snapshot.queryParamMap.get('fromInvitation') === '1' ||
    this.returnUrl().startsWith('/accept-invitation');

  private async navigateAfterAuth(): Promise<void> {
    const destination = this.returnUrl();
    const inviteToken = parseInvitationTokenFromUrl(destination);
    if (inviteToken) {
      markInvitationAuthReady(inviteToken);
    }
    clearPostAuthRedirect();
    await this.router.navigateByUrl(destination);
  }
  readonly magicSuccess = signal(false);
  readonly magicError = signal<NormalizedError | null>(null);
  readonly step = signal<'email' | 'sent'>('email');
  readonly sentEmail = signal('');

  readonly magicForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetToEmailStep(): void {
    this.step.set('email');
    this.magicSuccess.set(false);
    this.magicError.set(null);
  }

  async sendMagicLink(): Promise<void> {
    if (this.magicForm.invalid) return;
    this.magicError.set(null);
    this.magicSuccess.set(false);
    const email = this.magicForm.getRawValue().email;
    const destination = this.returnUrl();
    persistPostAuthRedirect(destination);
    const result = await this.authService.sendMagicLink(
      email,
      buildMagicLinkRedirectUrl(this.route.snapshot.queryParamMap.get('returnUrl'))
    );
    if (result.error) {
      this.magicError.set(result.error);
      return;
    }
    this.sentEmail.set(email);
    this.magicSuccess.set(true);
    this.step.set('sent');
  }
}
