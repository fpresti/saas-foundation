import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import {
  buildAcceptInvitationUrl,
  clearPostAuthRedirect,
  persistPostAuthRedirect,
} from '../../core/auth/post-auth-redirect';
import { clearInvitationAuthReady } from '../../core/auth/invitation-auth';
import { ProfileService } from '../../core/profile/profile.service';
import { needsMemberProfileOnboarding } from '../../core/profile/member-profile-onboarding.util';
import { AcceptInvitationStore } from './accept-invitation.store';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './accept-invitation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvitationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly session = inject(SessionStore);
  readonly store = inject(AcceptInvitationStore);
  private readonly profileService = inject(ProfileService);

  readonly token = signal('');
  readonly redirectingToLogin = signal(false);

  readonly isEmailMismatch = computed(() => {
    const msg = this.store.error()?.message?.toLowerCase() ?? '';
    return msg.includes('email') && msg.includes('match');
  });

  async ngOnInit(): Promise<void> {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);
    await this.session.waitForAuthSettled();
    await this.tryAccept();
  }

  private async redirectToLogin(token: string): Promise<void> {
    const returnUrl = buildAcceptInvitationUrl(token);
    persistPostAuthRedirect(returnUrl);
    clearInvitationAuthReady(token);
    this.redirectingToLogin.set(true);
    await this.router.navigate(['/login'], {
      queryParams: { returnUrl, fromInvitation: '1' },
    });
  }

  private async tryAccept(): Promise<void> {
    const token = this.token().trim();
    if (!token) return;

    if (!this.session.isAuthenticated()) {
      await this.redirectToLogin(token);
      return;
    }

    const ok = await this.store.accept(token);
    if (ok) {
      clearInvitationAuthReady(token);
      clearPostAuthRedirect();
      await this.session.loadAccessContext(this.store.successTenantId());
      try {
        const profile = await this.profileService.getOwnProfile();
        const destination = needsMemberProfileOnboarding(profile?.fullName)
          ? '/onboarding/complete-profile'
          : '/';
        await this.router.navigateByUrl(destination);
      } catch {
        await this.router.navigateByUrl('/onboarding/complete-profile');
      }
    }
  }

  async retry(): Promise<void> {
    await this.tryAccept();
  }

  async signOutAndContinue(): Promise<void> {
    const token = this.token().trim();
    if (!token) return;
    this.store.reset();
    await this.session.signOut();
    await this.redirectToLogin(token);
  }
}
