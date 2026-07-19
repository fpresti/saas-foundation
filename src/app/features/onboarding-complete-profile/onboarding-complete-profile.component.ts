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
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
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
  private readonly currentProfileStore = inject(CurrentProfileStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  readonly step = signal<'welcome' | 'profile'>('welcome');
  readonly loading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly avatarFile = signal<File | null>(null);
  readonly avatarPreviewUrl = signal<string | null>(null);

  readonly email = computed(() => this.sessionStore.session()?.user?.email ?? '');
  readonly tenantName = computed(() => this.sessionStore.activeTenant()?.name ?? '');

  readonly form = this.fb.nonNullable.group({
    givenName: ['', [Validators.required, Validators.minLength(2)]],
    familyName: ['', [Validators.required, Validators.minLength(2)]],
  });

  async ngOnInit(): Promise<void> {
    await this.sessionStore.ensureAccessContextReady();
  }

  continueToProfile(): void {
    this.step.set('profile');
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.error.set(null);

    const previous = this.avatarPreviewUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }

    if (!file) {
      this.avatarFile.set(null);
      this.avatarPreviewUrl.set(null);
      return;
    }

    this.avatarFile.set(file);
    this.avatarPreviewUrl.set(URL.createObjectURL(file));
  }

  clearAvatar(input: HTMLInputElement): void {
    const previous = this.avatarPreviewUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.avatarFile.set(null);
    this.avatarPreviewUrl.set(null);
    input.value = '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      const { givenName, familyName } = this.form.getRawValue();
      let avatarUrl: string | undefined;
      const file = this.avatarFile();
      if (file) {
        avatarUrl = await this.profileService.uploadOwnAvatar(file);
      }
      await this.profileService.updateOwnProfile({
        givenName,
        familyName,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });
      await this.currentProfileStore.refresh();
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
