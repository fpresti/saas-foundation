import { Injectable, inject } from '@angular/core';
import { logBootstrap, logBootstrapWarn } from './bootstrap-debug.log';
import { SupabaseService } from '../supabase/supabase.service';
import { NormalizedError, normalizeError } from '../utils/supabase-error.util';
import type { AccessContext } from '../../../types/access-context.types';

@Injectable({ providedIn: 'root' })
export class AccessContextService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetches access context from RPC. Pass tenantId to switch tenant context.
   */
  async getAccessContext(tenantId?: string | null): Promise<AccessContext> {
    logBootstrap('RPC get_access_context request', { p_tenant_id: tenantId ?? null });
    const { data, error } = await this.supabase.rpc('get_access_context', {
      p_tenant_id: tenantId ?? undefined,
    });

    const normalized = normalizeError(error);
    if (normalized) {
      logBootstrapWarn('RPC get_access_context supabase error', normalized);
      throw normalized;
    }

    logBootstrap('RPC get_access_context raw data', {
      type: data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : null,
      sample: Array.isArray(data) && data[0] ? Object.keys(data[0] as object) : null,
    });

    // RPC should return one row; if empty (RLS, stale deploy, client quirk), use safe default
    const row = Array.isArray(data) ? data[0] : data;
    if (row == null || typeof row !== 'object') {
      logBootstrapWarn(
        'RPC get_access_context empty row → using default context (revisa SQL / RLS / migraciones)'
      );
      return {
        is_super_admin: false,
        tenant_id: null,
        tenant_role: null,
        tenant_status: null,
        allowed_tenants: [],
      };
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

  /**
   * Backend permission check via RPC (no role-name branching in the client).
   */
  async hasPermission(tenantId: string, permissionCode: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('has_permission', {
      p_tenant_id: tenantId,
      p_permission_code: permissionCode,
    });
    const normalized = normalizeError(error);
    if (normalized) throw normalized;
    return Boolean(data);
  }
}
