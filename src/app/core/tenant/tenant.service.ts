import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { NormalizedError, normalizeError } from '../utils/supabase-error.util';
import { Tenant } from './tenant.types';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly supabase = inject(SupabaseService).client;

  /** Get current user's platform role from super_admins table. RLS enforces access. */
  async getMyPlatformRole(): Promise<'super_admin' | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const normalized = normalizeError(error);
    if (normalized) throw normalized;
    return data != null ? 'super_admin' : null;
  }

  /** Get tenants the current user is a member of (tenant_members joined to tenants). */
  async getMyMembershipTenants(): Promise<Tenant[]> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('tenant_members')
      .select('tenant_id, member_type, tenants(id, name)')
      .eq('user_id', user.id);

    const normalized = normalizeError(error);
    if (normalized) throw normalized;

    type MembershipRow = NonNullable<typeof data>[number];
    const rows: MembershipRow[] = data ?? [];
    const roleMap = (memberType: string): NonNullable<Tenant['role']> =>
      memberType === 'owner' || memberType === 'member' ? memberType : 'member';
    return rows
      .map((r): Tenant | null => {
        const tenant = r.tenants;
        if (tenant != null) {
          return { id: tenant.id, name: tenant.name, role: roleMap(r.member_type) };
        }
        return null;
      })
      .filter((t): t is Tenant => t !== null);
  }

  /** Get all tenants. For super_admin only; RLS must allow. */
  async getAllTenantsForSuperAdmin(): Promise<Tenant[]> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('id, name');

    const normalized = normalizeError(error);
    if (normalized) throw normalized;
    return (data ?? []).map((t) => ({ ...t, role: 'super_admin' as const }));
  }
}
