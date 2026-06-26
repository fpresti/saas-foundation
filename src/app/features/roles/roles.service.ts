import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';
import type { TenantRoleItem } from './types';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly supabase = inject(SupabaseService).client;

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
    const permById = new Map<string, string>();
    if (permIds.length > 0) {
      const { data: perms, error: pErr } = await this.supabase
        .from('permissions')
        .select('id, code')
        .in('id', permIds);
      const n3 = normalizeError(pErr);
      if (n3) throw n3;
      for (const p of perms ?? []) {
        permById.set(p.id, p.code);
      }
    }

    const codesByRole = new Map<string, string[]>();
    for (const row of rp ?? []) {
      const code = permById.get(row.permission_id);
      if (!code) continue;
      const list = codesByRole.get(row.role_id) ?? [];
      if (!list.includes(code)) list.push(code);
      codesByRole.set(row.role_id, list);
    }

    return roleRows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.is_system,
      permissionCodes: (codesByRole.get(r.id) ?? []).sort(),
    }));
  }
}
