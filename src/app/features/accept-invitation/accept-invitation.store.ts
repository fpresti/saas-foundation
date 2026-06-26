import { inject, Injectable, signal } from '@angular/core';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { AcceptInvitationService } from './accept-invitation.service';

@Injectable({ providedIn: 'root' })
export class AcceptInvitationStore {
  private readonly service = inject(AcceptInvitationService);

  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly successTenantId = signal<string | null>(null);

  reset(): void {
    this.isLoading.set(false);
    this.error.set(null);
    this.successTenantId.set(null);
  }

  async accept(token: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);
    this.successTenantId.set(null);
    try {
      const result = await this.service.accept(token);
      this.successTenantId.set(result.tenant_id);
      return true;
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Could not accept invitation.' };
      this.error.set(normalized);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }
}
