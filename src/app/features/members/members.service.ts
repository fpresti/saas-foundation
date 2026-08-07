import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError, extractEdgeFunctionError } from '../../core/utils/supabase-error.util';
import type { MemberListItem } from './members.view-model';

export type TenantRoleOption = { id: string; code: string; name: string };

export type CreateInvitationResult = {
  invitation_id: string;
  email: string;
  expires_at: string;
  tenant_id: string;
};

export type PendingInvitation = {
  id: string;
  email: string;
  memberType: string;
  expiresAt: string;
};

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Load all members for a tenant: membership rows, role assignments, role
   * metadata, and profiles. One list item per member (roles aggregated).
   */
  async loadMembersForTenant(tenantId: string): Promise<MemberListItem[]> {
    const { data: memberRows, error: errMembers } = await this.supabase.rpc(
      'list_tenant_members',
      { p_tenant_id: tenantId }
    );

    const n1 = normalizeError(errMembers);
    if (n1) throw n1;
    const members = memberRows ?? [];
    if (members.length === 0) return [];

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

    const rolesByUser = new Map<
      string,
      { ids: string[]; names: string[]; codes: string[] }
    >();
    for (const row of tmr) {
      const meta = roleById.get(row.role_id);
      if (!meta) continue;
      let bucket = rolesByUser.get(row.user_id);
      if (!bucket) {
        bucket = { ids: [], names: [], codes: [] };
        rolesByUser.set(row.user_id, bucket);
      }
      if (!bucket.ids.includes(row.role_id)) {
        bucket.ids.push(row.role_id);
        bucket.codes.push(meta.code);
        bucket.names.push(meta.name);
      }
    }

    const result: MemberListItem[] = [];
    for (const m of members) {
      const memberType: 'owner' | 'member' =
        m.member_type === 'owner' ? 'owner' : 'member';
      const roles = rolesByUser.get(m.user_id) ?? { ids: [], names: [], codes: [] };
      result.push({
        userId: m.user_id,
        email: m.email ?? null,
        givenName: m.given_name ?? null,
        familyName: m.family_name ?? null,
        avatarUrl: m.avatar_url ?? null,
        memberType,
        active: m.active !== false,
        roleIds: [...roles.ids],
        roleNames: [...roles.names],
        roleCodes: [...roles.codes],
      });
    }

    result.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const left = [a.givenName, a.familyName].filter(Boolean).join(' ') || a.email || a.userId;
      const right = [b.givenName, b.familyName].filter(Boolean).join(' ') || b.email || b.userId;
      return left.localeCompare(right);
    });
    return result;
  }

  async listRolesForTenant(tenantId: string): Promise<TenantRoleOption[]> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .order('name');

    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
    }));
  }

  async createInvitation(params: {
    tenantId: string;
    email: string;
    expiresInHours?: number;
  }): Promise<CreateInvitationResult> {
    const { data, error } = await this.supabase.functions.invoke('invite-member', {
      body: {
        tenantId: params.tenantId,
        email: params.email.trim(),
        expiresInHours: params.expiresInHours ?? 72,
      },
    });

    if (error) {
      throw await extractEdgeFunctionError(error, data, 'Invitation failed.');
    }

    const row = data as CreateInvitationResult | null;
    if (!row?.invitation_id) {
      throw await extractEdgeFunctionError(null, data, 'No invitation returned');
    }

    return row;
  }

  async revokeInvitation(params: {
    tenantId: string;
    invitationId: string;
  }): Promise<void> {
    const { error } = await this.supabase.rpc('revoke_invitation', {
      p_invitation_id: params.invitationId,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async resendInvitation(params: {
    tenantId: string;
    invitationId: string;
  }): Promise<CreateInvitationResult> {
    const { data, error } = await this.supabase.functions.invoke('resend-invitation', {
      body: {
        invitationId: params.invitationId,
        tenantId: params.tenantId,
      },
    });

    if (error) {
      throw await extractEdgeFunctionError(error, data, 'Resend failed.');
    }

    const row = data as CreateInvitationResult | null;
    if (!row?.invitation_id) {
      throw await extractEdgeFunctionError(null, data, 'Invitation not resent');
    }

    return row;
  }

  /** Replace the full set of roles for a member (multi-rol). */
  async setTenantMemberRoles(params: {
    tenantId: string;
    userId: string;
    roleIds: string[];
  }): Promise<void> {
    const { error } = await this.supabase.rpc('set_tenant_member_roles', {
      p_tenant_id: params.tenantId,
      p_user_id: params.userId,
      p_role_ids: params.roleIds,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async setMemberType(params: {
    tenantId: string;
    userId: string;
    memberType: 'owner' | 'member';
  }): Promise<void> {
    const { error } = await this.supabase.rpc('set_tenant_member_type', {
      p_tenant_id: params.tenantId,
      p_user_id: params.userId,
      p_member_type: params.memberType,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async setMemberActive(params: {
    tenantId: string;
    userId: string;
    active: boolean;
  }): Promise<void> {
    const { error } = await this.supabase.rpc('set_tenant_member_active', {
      p_tenant_id: params.tenantId,
      p_user_id: params.userId,
      p_active: params.active,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async updateMemberProfile(params: {
    tenantId: string;
    userId: string;
    givenName: string;
    familyName: string;
    avatarUrl?: string | null;
  }): Promise<void> {
    const args: {
      p_tenant_id: string;
      p_user_id: string;
      p_given_name: string;
      p_family_name: string;
      p_avatar_url?: string;
    } = {
      p_tenant_id: params.tenantId,
      p_user_id: params.userId,
      p_given_name: params.givenName,
      p_family_name: params.familyName,
    };
    if (params.avatarUrl) {
      args.p_avatar_url = params.avatarUrl;
    }
    const { error } = await this.supabase.rpc('update_tenant_member_profile', args);
    const n = normalizeError(error);
    if (n) throw n;
  }

  async listPendingInvitations(tenantId: string): Promise<PendingInvitation[]> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('id, email, member_type, expires_at')
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at');

    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      memberType: row.member_type,
      expiresAt: row.expires_at,
    }));
  }
}
