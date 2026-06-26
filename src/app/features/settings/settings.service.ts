import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';

export type TenantSettings = {
  id: string;
  name: string;
  slug: string;
  status: string;
  taxId: string;
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly supabase = inject(SupabaseService).client;

  async getTenant(tenantId: string): Promise<TenantSettings | null> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('id, name, slug, status, tax_id')
      .eq('id', tenantId)
      .maybeSingle();

    const n = normalizeError(error);
    if (n) throw n;
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      status: data.status,
      taxId: data.tax_id,
    };
  }
}
