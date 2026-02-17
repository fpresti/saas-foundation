import { Injectable } from '@angular/core';
import { getSupabaseClient } from '../supabase/supabase.client';
import { NormalizedError, normalizeError } from '../utils/supabase-error.util';
import { Tenant, TenantMembership } from './tenant.types';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly supabase = getSupabaseClient();

  /** Get current user's platform role. RLS enforces access. */
  async getMyPlatformRole(): Promise<'super_admin' | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('platform_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const normalized = normalizeError(error);
    if (normalized) throw normalized;
    if (data?.role === 'super_admin') return 'super_admin';
    return null;
  }

  /** Get tenants the current user is a member of (tenant_users joined to tenants). */
  async getMyMembershipTenants(): Promise<Tenant[]> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('tenant_users')
      .select('tenant_id, role, tenants(id, name)')
      .eq('user_id', user.id);

    const normalized = normalizeError(error);
    if (normalized) throw normalized;

    const rows = (data ?? []) as unknown as TenantMembership[];
    return rows
      .map((r) => (Array.isArray(r.tenants) ? r.tenants[0] ?? null : null))
      .filter((t): t is Tenant => t !== null);
  }

  /** Get all tenants. For super_admin only; RLS must allow. */
  async getAllTenantsForSuperAdmin(): Promise<Tenant[]> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('id, name');

    const normalized = normalizeError(error);
    if (normalized) throw normalized;
    return (data ?? []) as Tenant[];
  }
}
