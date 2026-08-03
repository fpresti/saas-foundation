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

export type PlanOption = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
};

export type TenantSubscriptionInfo = {
  planId: string;
  planName: string;
  status: string;
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

  async getSubscription(tenantId: string): Promise<TenantSubscriptionInfo | null> {
    const { data: sub, error } = await this.supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const n = normalizeError(error);
    if (n) throw n;
    if (!sub) return null;

    const { data: plan, error: planErr } = await this.supabase
      .from('plans')
      .select('name')
      .eq('id', sub.plan_id)
      .maybeSingle();

    const n2 = normalizeError(planErr);
    if (n2) throw n2;

    return {
      planId: sub.plan_id,
      planName: plan?.name ?? sub.plan_id,
      status: sub.status,
    };
  }

  async listPlans(): Promise<PlanOption[]> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('id, name, description, price')
      .order('name');

    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
    }));
  }

  async changePlan(tenantId: string, planId: string): Promise<void> {
    const { error } = await this.supabase.rpc('change_tenant_plan', {
      p_tenant_id: tenantId,
      p_plan_id: planId,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }
}
