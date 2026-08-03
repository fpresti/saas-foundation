import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';
import type { PermissionCatalogItem, TenantRoleItem } from './types';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly supabase = inject(SupabaseService).client;

  async listPermissions(): Promise<PermissionCatalogItem[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('id, code, name, description')
      .order('code');

    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
    }));
  }

  async listForTenant(tenantId: string): Promise<TenantRoleItem[]> {
    const { data: roles, error: rolesErr } = await this.supabase
      .from('roles')
      .select('id, code, name, description, is_system')
      .eq('tenant_id', tenantId)
      .order('name');

    const n1 = normalizeError(rolesErr);
    if (n1) throw n1;
    const roleRows = roles ?? [];
    if (roleRows.length === 0) return [];

    const roleIds = roleRows.map((r) => r.id);
    const { data: rp, error: rpErr } = await this.supabase
      .from('role_permissions')
      .select('role_id, permission_id')
      .in('role_id', roleIds);

    const n2 = normalizeError(rpErr);
    if (n2) throw n2;

    const permIds = [...new Set((rp ?? []).map((x) => x.permission_id))];
    const permById = new Map<string, { code: string }>();
    if (permIds.length > 0) {
      const { data: perms, error: pErr } = await this.supabase
        .from('permissions')
        .select('id, code')
        .in('id', permIds);
      const n3 = normalizeError(pErr);
      if (n3) throw n3;
      for (const p of perms ?? []) {
        permById.set(p.id, { code: p.code });
      }
    }

    const idsByRole = new Map<string, string[]>();
    const codesByRole = new Map<string, string[]>();
    for (const row of rp ?? []) {
      const meta = permById.get(row.permission_id);
      if (!meta) continue;
      const ids = idsByRole.get(row.role_id) ?? [];
      const codes = codesByRole.get(row.role_id) ?? [];
      if (!ids.includes(row.permission_id)) {
        ids.push(row.permission_id);
        codes.push(meta.code);
        idsByRole.set(row.role_id, ids);
        codesByRole.set(row.role_id, codes);
      }
    }

    return roleRows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.is_system,
      permissionIds: [...(idsByRole.get(r.id) ?? [])],
      permissionCodes: [...(codesByRole.get(r.id) ?? [])].sort(),
    }));
  }

  async createRole(input: {
    tenantId: string;
    code: string;
    name: string;
    description: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.from('roles').insert({
      tenant_id: input.tenantId,
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description,
      is_system: false,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async updateRole(input: {
    roleId: string;
    code: string;
    name: string;
    description: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('roles')
      .update({
        code: input.code.trim(),
        name: input.name.trim(),
        description: input.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.roleId);
    const n = normalizeError(error);
    if (n) throw n;
  }

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await this.supabase.from('roles').delete().eq('id', roleId);
    const n = normalizeError(error);
    if (n) throw n;
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const { error: delErr } = await this.supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);
    const n1 = normalizeError(delErr);
    if (n1) throw n1;

    if (permissionIds.length === 0) return;

    const { error } = await this.supabase.from('role_permissions').insert(
      permissionIds.map((permission_id) => ({
        role_id: roleId,
        permission_id,
      }))
    );
    const n2 = normalizeError(error);
    if (n2) throw n2;
  }

  async createPermission(input: {
    code: string;
    name: string;
    description: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.from('permissions').insert({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async updatePermission(input: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('permissions')
      .update({
        code: input.code.trim(),
        name: input.name.trim(),
        description: input.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id);
    const n = normalizeError(error);
    if (n) throw n;
  }

  async deletePermission(id: string): Promise<void> {
    const { error } = await this.supabase.from('permissions').delete().eq('id', id);
    const n = normalizeError(error);
    if (n) throw n;
  }
}
