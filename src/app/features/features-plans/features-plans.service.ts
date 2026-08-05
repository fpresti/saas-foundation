import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';
import type { FeatureCatalogItem, PlanCatalogItem } from './types';

@Injectable({ providedIn: 'root' })
export class FeaturesPlansService {
  private readonly supabase = inject(SupabaseService).client;

  async listFeatures(): Promise<FeatureCatalogItem[]> {
    const { data, error } = await this.supabase
      .from('features')
      .select('id, code, name, description')
      .order('code');

    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((f) => ({
      id: f.id,
      code: f.code,
      name: f.name,
      description: f.description,
    }));
  }

  async listPlans(): Promise<PlanCatalogItem[]> {
    const { data: plans, error: plansErr } = await this.supabase
      .from('plans')
      .select('id, name, description, price, provider_price_id')
      .order('name');

    const n1 = normalizeError(plansErr);
    if (n1) throw n1;
    const planRows = plans ?? [];
    if (planRows.length === 0) return [];

    const planIds = planRows.map((p) => p.id);
    const { data: pf, error: pfErr } = await this.supabase
      .from('plan_features')
      .select('plan_id, feature_id')
      .in('plan_id', planIds);

    const n2 = normalizeError(pfErr);
    if (n2) throw n2;

    const featureIds = [...new Set((pf ?? []).map((x) => x.feature_id))];
    const featureById = new Map<string, { code: string }>();
    if (featureIds.length > 0) {
      const { data: features, error: fErr } = await this.supabase
        .from('features')
        .select('id, code')
        .in('id', featureIds);
      const n3 = normalizeError(fErr);
      if (n3) throw n3;
      for (const f of features ?? []) {
        featureById.set(f.id, { code: f.code });
      }
    }

    const idsByPlan = new Map<string, string[]>();
    const codesByPlan = new Map<string, string[]>();
    for (const row of pf ?? []) {
      const meta = featureById.get(row.feature_id);
      if (!meta) continue;
      const ids = idsByPlan.get(row.plan_id) ?? [];
      const codes = codesByPlan.get(row.plan_id) ?? [];
      if (!ids.includes(row.feature_id)) {
        ids.push(row.feature_id);
        codes.push(meta.code);
        idsByPlan.set(row.plan_id, ids);
        codesByPlan.set(row.plan_id, codes);
      }
    }

    return planRows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      providerPriceId: p.provider_price_id,
      featureIds: [...(idsByPlan.get(p.id) ?? [])],
      featureCodes: [...(codesByPlan.get(p.id) ?? [])].sort(),
    }));
  }

  async listPlanFeatureIds(planId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('plan_features')
      .select('feature_id')
      .eq('plan_id', planId);
    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((r) => r.feature_id);
  }

  async createFeature(input: {
    code: string;
    name: string;
    description: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.from('features').insert({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async updateFeature(input: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('features')
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

  async deleteFeature(id: string): Promise<void> {
    const { error } = await this.supabase.from('features').delete().eq('id', id);
    const n = normalizeError(error);
    if (n) throw n;
  }

  async createPlan(input: {
    name: string;
    description: string | null;
    price: number | null;
    providerPriceId: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.from('plans').insert({
      name: input.name.trim(),
      description: input.description,
      price: input.price,
      provider_price_id: input.providerPriceId,
    });
    const n = normalizeError(error);
    if (n) throw n;
  }

  async updatePlan(input: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    providerPriceId: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('plans')
      .update({
        name: input.name.trim(),
        description: input.description,
        price: input.price,
        provider_price_id: input.providerPriceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id);
    const n = normalizeError(error);
    if (n) throw n;
  }

  async setPlanFeatures(planId: string, featureIds: string[]): Promise<void> {
    const { error: delErr } = await this.supabase
      .from('plan_features')
      .delete()
      .eq('plan_id', planId);
    const n1 = normalizeError(delErr);
    if (n1) throw n1;

    if (featureIds.length === 0) return;

    const { error } = await this.supabase.from('plan_features').insert(
      featureIds.map((feature_id) => ({ plan_id: planId, feature_id }))
    );
    const n2 = normalizeError(error);
    if (n2) throw n2;
  }
}
