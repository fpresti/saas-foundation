import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { ProfileService } from '../../core/profile/profile.service';
import { SessionStore } from '../../core/auth/session.store';

@Component({
  selector: 'app-onboarding-complete-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './onboarding-complete-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingCompleteProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  readonly step = signal<'welcome' | 'profile'>('welcome');
  readonly loading = signal(false);
  readonly error = signal<NormalizedError | null>(null);

  readonly email = computed(() => this.sessionStore.session()?.user?.email ?? '');
  readonly tenantName = computed(() => this.sessionStore.activeTenant()?.name ?? '');

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
  });

  async ngOnInit(): Promise<void> {
    await this.sessionStore.ensureAccessContextReady();
  }

  continueToProfile(): void {
    this.step.set('profile');
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.profileService.updateOwnFullName(this.form.getRawValue().fullName);
      await this.router.navigateByUrl('/');
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Could not save your profile.' };
      this.error.set(normalized);
    } finally {
      this.loading.set(false);
    }
  }
}
