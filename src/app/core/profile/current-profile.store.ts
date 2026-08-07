import { computed, inject, Injectable, signal } from '@angular/core';
import { ProfileService } from './profile.service';
import { formatDisplayName, type OwnProfile } from './profile.types';

@Injectable({ providedIn: 'root' })
export class CurrentProfileStore {
  private readonly profileService = inject(ProfileService);

  readonly profile = signal<OwnProfile | null>(null);
  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');

  readonly displayName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return formatDisplayName(p.givenName, p.familyName);
  });

  readonly avatarUrl = computed(() => this.profile()?.avatarUrl ?? null);

  readonly initials = computed(() => {
    const p = this.profile();
    if (!p) return '?';
    const given = p.givenName?.trim()?.[0] ?? '';
    const family = p.familyName?.trim()?.[0] ?? '';
    const fromName = `${given}${family}`.toUpperCase();
    return fromName || '?';
  });

  async ensureLoaded(): Promise<void> {
    if (this.status() === 'ready' || this.status() === 'loading') return;
    this.status.set('loading');
    try {
      const profile = await this.profileService.getOwnProfile();
      this.profile.set(profile);
      this.status.set('ready');
    } catch {
      this.profile.set(null);
      this.status.set('error');
    }
  }

  async refresh(): Promise<void> {
    this.status.set('idle');
    await this.ensureLoaded();
  }

  reset(): void {
    this.profile.set(null);
    this.status.set('idle');
  }
}
