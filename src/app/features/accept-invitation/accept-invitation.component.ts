import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
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

  readonly token = signal('');

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);
    void this.tryAccept();
  }

  private async tryAccept(): Promise<void> {
    const token = this.token().trim();
    if (!token) return;

    if (!this.session.isAuthenticated()) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/accept-invitation?token=${encodeURIComponent(token)}` },
      });
      return;
    }

    const ok = await this.store.accept(token);
    if (ok) {
      await this.session.loadAccessContext(this.store.successTenantId());
      await this.router.navigateByUrl('/');
    }
  }

  async retry(): Promise<void> {
    await this.tryAccept();
  }
}
