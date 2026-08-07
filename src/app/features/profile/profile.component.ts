import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import { ProfileService } from '../../core/profile/profile.service';
import { SessionStore } from '../../core/auth/session.store';
import { UserAvatarComponent } from '../app-shell/components/user-avatar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, UserAvatarComponent],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly currentProfileStore = inject(CurrentProfileStore);
  private readonly sessionStore = inject(SessionStore);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly success = signal(false);
  readonly avatarFile = signal<File | null>(null);
  readonly avatarPreviewUrl = signal<string | null>(null);

  readonly email = computed(() => this.sessionStore.session()?.user?.email ?? '—');
  readonly avatarSrc = computed(
    () => this.avatarPreviewUrl() ?? this.currentProfileStore.avatarUrl()
  );
  readonly avatarInitials = computed(() => this.currentProfileStore.initials());

  readonly form = this.fb.nonNullable.group({
    givenName: ['', [Validators.required, Validators.minLength(2)]],
    familyName: ['', [Validators.required, Validators.minLength(2)]],
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.currentProfileStore.refresh();
      const profile = this.currentProfileStore.profile();
      this.form.patchValue({
        givenName: profile?.givenName ?? '',
        familyName: profile?.familyName ?? '',
      });
    } catch (e) {
      this.error.set(normalizeCaught(e, 'Could not load your profile.'));
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    const preview = this.avatarPreviewUrl();
    if (preview) URL.revokeObjectURL(preview);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.error.set(null);
    this.success.set(false);

    const previous = this.avatarPreviewUrl();
    if (previous) URL.revokeObjectURL(previous);

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
    if (previous) URL.revokeObjectURL(previous);
    this.avatarFile.set(null);
    this.avatarPreviewUrl.set(null);
    input.value = '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    this.success.set(false);
    this.saving.set(true);
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
      this.avatarFile.set(null);
      const preview = this.avatarPreviewUrl();
      if (preview) {
        URL.revokeObjectURL(preview);
        this.avatarPreviewUrl.set(null);
      }
      this.success.set(true);
    } catch (e) {
      this.error.set(normalizeCaught(e, 'Could not save your profile.'));
    } finally {
      this.saving.set(false);
    }
  }
}

function normalizeCaught(e: unknown, fallback: string): NormalizedError {
  if (e && typeof e === 'object' && 'message' in e) {
    return e as NormalizedError;
  }
  return { code: 'unknown', message: fallback };
}
