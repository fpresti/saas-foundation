import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { NormalizedError, normalizeError } from '../../../core/utils/supabase-error.util';
import type { AccessContext } from '../types';

@Injectable({ providedIn: 'root' })
export class AccessContextService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetches access context from RPC. Pass tenantId to switch tenant context.
   */
  async getAccessContext(tenantId?: string | null): Promise<AccessContext> {
    const { data, error } = await this.supabase.rpc('get_access_context', {
      p_tenant_id: tenantId ?? undefined,
    });

    const normalized = normalizeError(error);
    if (normalized) throw normalized;

    const row = data?.[0];
    if (!row) {
      throw { code: 'empty', message: 'get_access_context returned no data' } as NormalizedError;
    }

    const role = row.tenant_role;
    const tenantRole: AccessContext['tenant_role'] =
      role === 'owner' || role === 'member' ? role : null;

    return {
      is_super_admin: Boolean(row.is_super_admin),
      tenant_id: row.tenant_id ?? null,
      tenant_role: tenantRole,
      tenant_status: row.tenant_status ?? null,
      allowed_tenants: Array.isArray(row.allowed_tenants)
        ? (row.allowed_tenants as unknown as AccessContext['allowed_tenants'])
        : [],
    };
  }
}
