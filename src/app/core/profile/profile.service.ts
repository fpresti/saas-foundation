import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizeError } from '../utils/supabase-error.util';
import {
  prepareAvatarImage,
  isAllowedAvatarSourceMime,
  AVATAR_MAX_SOURCE_BYTES,
} from './avatar-image.util';
import type { OwnProfile } from './profile.types';

const AVATARS_BUCKET = 'avatars';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject(SupabaseService).client;

  async getOwnProfile(): Promise<OwnProfile | null> {
    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    const userErr = normalizeError(userError);
    if (userErr) throw userErr;
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await this.supabase
      .from('profiles')
      .select('user_id, given_name, family_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    const n = normalizeError(error);
    if (n) throw n;
    if (!data) {
      return { userId, givenName: null, familyName: null, avatarUrl: null };
    }
    return {
      userId: data.user_id,
      givenName: data.given_name,
      familyName: data.family_name,
      avatarUrl: data.avatar_url,
    };
  }

  async updateOwnProfile(params: {
    givenName: string;
    familyName: string;
    avatarUrl?: string | null;
  }): Promise<void> {
    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    const userErr = normalizeError(userError);
    if (userErr) throw userErr;
    const userId = userData.user?.id;
    if (!userId) {
      throw { code: 'not_authenticated', message: 'Not authenticated' };
    }

    const row: {
      user_id: string;
      given_name: string;
      family_name: string;
      updated_at: string;
      avatar_url?: string | null;
    } = {
      user_id: userId,
      given_name: params.givenName.trim(),
      family_name: params.familyName.trim(),
      updated_at: new Date().toISOString(),
    };
    if (params.avatarUrl !== undefined) {
      row.avatar_url = params.avatarUrl;
    }

    const { error } = await this.supabase.from('profiles').upsert(row, { onConflict: 'user_id' });

    const n = normalizeError(error);
    if (n) throw n;
  }

  /** Resize/compress then upload avatar; returns its public URL. */
  async uploadOwnAvatar(file: File): Promise<string> {
    if (!isAllowedAvatarSourceMime(file.type)) {
      throw {
        code: 'invalid_mime',
        message: 'Use JPEG, PNG or WebP.',
      };
    }
    if (file.size > AVATAR_MAX_SOURCE_BYTES) {
      throw {
        code: 'file_too_large',
        message: 'Image is too large to process. Choose a smaller file.',
      };
    }

    const prepared = await prepareAvatarImage(file);

    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    const userErr = normalizeError(userError);
    if (userErr) throw userErr;
    const userId = userData.user?.id;
    if (!userId) {
      throw { code: 'not_authenticated', message: 'Not authenticated' };
    }

    const ext = prepared.type === 'image/jpeg' ? 'jpg' : 'webp';
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await this.supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, prepared, { upsert: true, contentType: prepared.type });

    const uploadErr = normalizeError(uploadError);
    if (uploadErr) throw uploadErr;

    const { data } = this.supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
    // Bust CDN/cache when replacing the same path.
    return `${data.publicUrl}?t=${Date.now()}`;
  }
}
