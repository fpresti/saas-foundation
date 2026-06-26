import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';

export type AcceptInvitationResult = {
  invitation_id: string;
  tenant_id: string;
  member_type: string;
};

@Injectable({ providedIn: 'root' })
export class AcceptInvitationService {
  private readonly supabase = inject(SupabaseService).client;

  async accept(token: string): Promise<AcceptInvitationResult> {
    const { data, error } = await this.supabase.rpc('accept_invitation', {
      p_token: token.trim(),
    });
    const n = normalizeError(error);
    if (n) throw n;
    const row = data?.[0];
    if (!row) {
      throw { code: 'empty', message: 'Invitation could not be accepted.' };
    }
    return {
      invitation_id: row.invitation_id,
      tenant_id: row.tenant_id,
      member_type: row.member_type,
    };
  }
}
