import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { normalizeError } from '../../core/utils/supabase-error.util';

export type FeatureRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
};

export type PermissionRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

@Injectable({ providedIn: 'root' })
export class PlatformCatalogService {
  private readonly supabase = inject(SupabaseService).client;

  async listFeatures(): Promise<FeatureRow[]> {
    const { data, error } = await this.supabase
      .from('features')
      .select('id, code, name, description')
      .order('code');
    const n = normalizeError(error);
    if (n) throw n;
    return data ?? [];
  }

  async listPlans(): Promise<PlanRow[]> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('id, name, description, price')
      .order('name');
    const n = normalizeError(error);
    if (n) throw n;
    return data ?? [];
  }

  async listPermissions(): Promise<PermissionRow[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('id, code, name, description')
      .order('code');
    const n = normalizeError(error);
    if (n) throw n;
    return data ?? [];
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

  async listFeaturePermissionIds(featureId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('feature_permissions')
      .select('permission_id')
      .eq('feature_id', featureId);
    const n = normalizeError(error);
    if (n) throw n;
    return (data ?? []).map((r) => r.permission_id);
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

  async createPlan(input: {
    name: string;
    description: string | null;
    price: number | null;
  }): Promise<void> {
    const { error } = await this.supabase.from('plans').insert({
      name: input.name.trim(),
      description: input.description,
      price: input.price,
    });
    const n = normalizeError(error);
    if (n) throw n;
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

  async setFeaturePermissions(
    featureId: string,
    permissionIds: string[]
  ): Promise<void> {
    const { error: delErr } = await this.supabase
      .from('feature_permissions')
      .delete()
      .eq('feature_id', featureId);
    const n1 = normalizeError(delErr);
    if (n1) throw n1;

    if (permissionIds.length === 0) return;

    const { error } = await this.supabase.from('feature_permissions').insert(
      permissionIds.map((permission_id) => ({
        feature_id: featureId,
        permission_id,
      }))
    );
    const n2 = normalizeError(error);
    if (n2) throw n2;
  }

  async deleteFeature(id: string): Promise<void> {
    const { error } = await this.supabase.from('features').delete().eq('id', id);
    const n = normalizeError(error);
    if (n) throw n;
  }

  async deletePermission(id: string): Promise<void> {
    const { error } = await this.supabase.from('permissions').delete().eq('id', id);
    const n = normalizeError(error);
    if (n) throw n;
  }
}
