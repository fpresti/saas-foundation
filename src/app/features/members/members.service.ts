import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';
import type { MemberListItem } from './members.view-model';

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Load all members for a tenant: membership rows, role assignments, role
   * metadata, and profiles. One list item per member (roles aggregated).
   */
  async loadMembersForTenant(tenantId: string): Promise<MemberListItem[]> {
    const { data: memberRows, error: errMembers } = await this.supabase
      .from('tenant_members')
      .select('user_id, member_type')
      .eq('tenant_id', tenantId);

    const n1 = normalizeError(errMembers);
    if (n1) throw n1;
    const members = memberRows ?? [];
    if (members.length === 0) return [];

    const userIds = members.map((m) => m.user_id);

    const { data: tmrRows, error: errTmr } = await this.supabase
      .from('tenant_member_roles')
      .select('user_id, role_id')
      .eq('tenant_id', tenantId);

    const n2 = normalizeError(errTmr);
    if (n2) throw n2;
    const tmr = tmrRows ?? [];

    const roleIds = [...new Set(tmr.map((r) => r.role_id))];
    const roleById = new Map<string, { code: string; name: string }>();

    if (roleIds.length > 0) {
      const { data: roleRows, error: errRoles } = await this.supabase
        .from('roles')
        .select('id, code, name')
        .eq('tenant_id', tenantId)
        .in('id', roleIds);

      const n3 = normalizeError(errRoles);
      if (n3) throw n3;
      for (const row of roleRows ?? []) {
        roleById.set(row.id, { code: row.code, name: row.name });
      }
    }

    const { data: profileRows, error: errProfiles } = await this.supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const n4 = normalizeError(errProfiles);
    if (n4) throw n4;
    const profileByUser = new Map<
      string,
      { full_name: string | null; avatar_url: string | null }
    >();
    for (const p of profileRows ?? []) {
      profileByUser.set(p.user_id, {
        full_name: p.full_name,
        avatar_url: p.avatar_url,
      });
    }

    const rolesByUser = new Map<string, { names: string[]; codes: string[] }>();
    for (const row of tmr) {
      const meta = roleById.get(row.role_id);
      if (!meta) continue;
      let bucket = rolesByUser.get(row.user_id);
      if (!bucket) {
        bucket = { names: [], codes: [] };
        rolesByUser.set(row.user_id, bucket);
      }
      if (!bucket.codes.includes(meta.code)) {
        bucket.codes.push(meta.code);
        bucket.names.push(meta.name);
      }
    }

    const result: MemberListItem[] = [];
    for (const m of members) {
      const memberType: 'owner' | 'member' =
        m.member_type === 'owner' ? 'owner' : 'member';
      const profile = profileByUser.get(m.user_id);
      const roles = rolesByUser.get(m.user_id) ?? { names: [], codes: [] };
      result.push({
        userId: m.user_id,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        memberType,
        roleNames: [...roles.names],
        roleCodes: [...roles.codes],
      });
    }

    result.sort((a, b) =>
      (a.fullName || a.userId).localeCompare(b.fullName || b.userId)
    );
    return result;
  }
}
