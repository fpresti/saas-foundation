import { Injectable } from '@angular/core';
import { getSupabaseClient } from '../supabase/supabase.client';
import { NormalizedError, normalizeError } from '../utils/supabase-error.util';

@Injectable({ providedIn: 'root' })
export class TenantOnboardingService {
  private readonly supabase = getSupabaseClient();

  /**
   * Create a new tenant with the current user as owner.
   * RPC: create_tenant_with_owner(p_tenant_name, p_tax_id, p_slug [, p_plan_name])
   */
  async createTenantWithOwner(
    name: string,
    taxId: string
  ): Promise<{ error?: NormalizedError }> {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const { error } = await this.supabase.rpc('create_tenant_with_owner', {
      p_tenant_name: name,
      p_tax_id: taxId,
      p_slug: slug || 'tenant'
    });
    const normalized = normalizeError(error);
    if (normalized) return { error: normalized };
    return {};
  }
}
