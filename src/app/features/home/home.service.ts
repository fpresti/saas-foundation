import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';

export type HomeSummary = {
  tenantName: string;
  tenantStatus: string;
  memberCount: number;
  planName: string | null;
  subscriptionStatus: string | null;
};

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly supabase = inject(SupabaseService).client;

  async loadSummary(tenantId: string): Promise<HomeSummary> {
    const { data: tenant, error: tErr } = await this.supabase
      .from('tenants')
      .select('name, status')
      .eq('id', tenantId)
      .maybeSingle();
    const n1 = normalizeError(tErr);
    if (n1) throw n1;

    const { count, error: cErr } = await this.supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    const n2 = normalizeError(cErr);
    if (n2) throw n2;

    const { data: sub, error: sErr } = await this.supabase
      .from('subscriptions')
      .select('status, plans(name)')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    const n3 = normalizeError(sErr);
    if (n3) throw n3;

    const planRow = sub?.plans as { name: string } | { name: string }[] | null;
    const planName = Array.isArray(planRow) ? planRow[0]?.name : planRow?.name;

    return {
      tenantName: tenant?.name ?? '—',
      tenantStatus: tenant?.status ?? '—',
      memberCount: count ?? 0,
      planName: planName ?? null,
      subscriptionStatus: sub?.status ?? null,
    };
  }
}
