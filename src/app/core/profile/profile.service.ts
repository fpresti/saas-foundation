import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizeError } from '../utils/supabase-error.util';
import type { OwnProfile } from './profile.types';

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
      .select('user_id, full_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    const n = normalizeError(error);
    if (n) throw n;
    if (!data) {
      return { userId, fullName: null, avatarUrl: null };
    }
    return {
      userId: data.user_id,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
    };
  }

  async updateOwnFullName(fullName: string): Promise<void> {
    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    const userErr = normalizeError(userError);
    if (userErr) throw userErr;
    const userId = userData.user?.id;
    if (!userId) {
      throw { code: 'not_authenticated', message: 'Not authenticated' };
    }

    const trimmed = fullName.trim();
    const { error } = await this.supabase.from('profiles').upsert(
      {
        user_id: userId,
        full_name: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    const n = normalizeError(error);
    if (n) throw n;
  }
}
