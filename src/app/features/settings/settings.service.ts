import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import {
  extractEdgeFunctionError,
  normalizeError,
} from '../../core/utils/supabase-error.util';

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
  /** Stripe price id when set — plan changes go through Checkout. */
  providerPriceId: string | null;
};

export type TenantSubscriptionInfo = {
  planId: string;
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  provider: string | null;
  billingCustomerId: string | null;
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
      .select(
        'plan_id, status, current_period_end, canceled_at, provider, billing_customer_id'
      )
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
      currentPeriodEnd: sub.current_period_end,
      canceledAt: sub.canceled_at,
      provider: sub.provider,
      billingCustomerId: sub.billing_customer_id,
    };
  }

  async listPlans(): Promise<PlanOption[]> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('id, name, description, price, provider_price_id')
      .order('name');

    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      providerPriceId: p.provider_price_id,
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

  /**
   * Starts Stripe Checkout for a paid plan. Returns the hosted Checkout URL.
   */
  async createCheckoutSession(params: {
    tenantId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const { data, error } = await this.supabase.functions.invoke('create-checkout-session', {
      body: {
        tenantId: params.tenantId,
        planId: params.planId,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      },
    });
    if (error) {
      throw await extractEdgeFunctionError(error, data, 'Checkout failed.');
    }
    const url = (data as { url?: string } | null)?.url;
    if (!url) {
      throw await extractEdgeFunctionError(null, data, 'Checkout URL missing from response.');
    }
    return url;
  }

  /** Opens Stripe Customer Portal. Returns the portal URL. */
  async createPortalSession(params: {
    tenantId: string;
    returnUrl: string;
  }): Promise<string> {
    const { data, error } = await this.supabase.functions.invoke('create-portal-session', {
      body: {
        tenantId: params.tenantId,
        returnUrl: params.returnUrl,
      },
    });
    if (error) {
      throw await extractEdgeFunctionError(error, data, 'Portal session failed.');
    }
    const url = (data as { url?: string } | null)?.url;
    if (!url) {
      throw await extractEdgeFunctionError(null, data, 'Portal URL missing from response.');
    }
    return url;
  }
}
