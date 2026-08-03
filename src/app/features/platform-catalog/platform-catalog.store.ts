import { inject, Injectable, signal } from '@angular/core';
import { AppResetService } from '../../core/services/app-reset.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import {
  PlatformCatalogService,
  type FeatureRow,
  type PermissionRow,
  type PlanRow,
} from './platform-catalog.service';

export type PlatformTab = 'features' | 'plans' | 'permissions' | 'mappings';

@Injectable({ providedIn: 'root' })
export class PlatformCatalogStore {
  private readonly api = inject(PlatformCatalogService);
  private readonly appReset = inject(AppResetService);

  readonly tab = signal<PlatformTab>('features');
  readonly features = signal<FeatureRow[]>([]);
  readonly plans = signal<PlanRow[]>([]);
  readonly permissions = signal<PermissionRow[]>([]);
  readonly isLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly message = signal<string | null>(null);

  readonly draftFeatureCode = signal('');
  readonly draftFeatureName = signal('');
  readonly draftFeatureDescription = signal('');

  readonly draftPlanName = signal('');
  readonly draftPlanDescription = signal('');
  readonly draftPlanPrice = signal('');

  readonly draftPermCode = signal('');
  readonly draftPermName = signal('');
  readonly draftPermDescription = signal('');

  readonly mapPlanId = signal('');
  readonly mapFeatureIds = signal<string[]>([]);
  readonly mapFeatureId = signal('');
  readonly mapPermissionIds = signal<string[]>([]);

  constructor() {
    this.appReset.registerResettable('platform-catalog', this);
  }

  reset(): void {
    this.features.set([]);
    this.plans.set([]);
    this.permissions.set([]);
    this.error.set(null);
    this.message.set(null);
    this.mapPlanId.set('');
    this.mapFeatureId.set('');
    this.mapFeatureIds.set([]);
    this.mapPermissionIds.set([]);
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const [features, plans, permissions] = await Promise.all([
        this.api.listFeatures(),
        this.api.listPlans(),
        this.api.listPermissions(),
      ]);
      this.features.set(features);
      this.plans.set(plans);
      this.permissions.set(permissions);
      if (!this.mapPlanId() && plans[0]) this.mapPlanId.set(plans[0].id);
      if (!this.mapFeatureId() && features[0]) this.mapFeatureId.set(features[0].id);
      await this.reloadMappings();
    } catch (e) {
      this.error.set(asError(e, 'Could not load platform catalog.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async reloadMappings(): Promise<void> {
    const planId = this.mapPlanId();
    const featureId = this.mapFeatureId();
    try {
      if (planId) {
        this.mapFeatureIds.set(await this.api.listPlanFeatureIds(planId));
      } else {
        this.mapFeatureIds.set([]);
      }
      if (featureId) {
        this.mapPermissionIds.set(await this.api.listFeaturePermissionIds(featureId));
      } else {
        this.mapPermissionIds.set([]);
      }
    } catch (e) {
      this.error.set(asError(e, 'Could not load mappings.'));
    }
  }

  async createFeature(): Promise<void> {
    const code = this.draftFeatureCode().trim();
    const name = this.draftFeatureName().trim();
    if (!code || !name) {
      this.message.set('Feature code and name are required.');
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.api.createFeature({
        code,
        name,
        description: this.draftFeatureDescription().trim() || null,
      });
      this.draftFeatureCode.set('');
      this.draftFeatureName.set('');
      this.draftFeatureDescription.set('');
      this.message.set('Feature created.');
      await this.load();
    } catch (e) {
      this.error.set(asError(e, 'Could not create feature.'));
    } finally {
      this.busy.set(false);
    }
  }

  async createPlan(): Promise<void> {
    const name = this.draftPlanName().trim();
    if (!name) {
      this.message.set('Plan name is required.');
      return;
    }
    const priceRaw = this.draftPlanPrice().trim();
    const price = priceRaw === '' ? null : Number(priceRaw);
    if (priceRaw !== '' && Number.isNaN(price)) {
      this.message.set('Invalid price.');
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.api.createPlan({
        name,
        description: this.draftPlanDescription().trim() || null,
        price,
      });
      this.draftPlanName.set('');
      this.draftPlanDescription.set('');
      this.draftPlanPrice.set('');
      this.message.set('Plan created.');
      await this.load();
    } catch (e) {
      this.error.set(asError(e, 'Could not create plan.'));
    } finally {
      this.busy.set(false);
    }
  }

  async createPermission(): Promise<void> {
    const code = this.draftPermCode().trim();
    const name = this.draftPermName().trim();
    if (!code || !name) {
      this.message.set('Permission code and name are required.');
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.api.createPermission({
        code,
        name,
        description: this.draftPermDescription().trim() || null,
      });
      this.draftPermCode.set('');
      this.draftPermName.set('');
      this.draftPermDescription.set('');
      this.message.set('Permission created.');
      await this.load();
    } catch (e) {
      this.error.set(asError(e, 'Could not create permission.'));
    } finally {
      this.busy.set(false);
    }
  }

  toggleMapFeature(featureId: string, checked: boolean): void {
    const cur = this.mapFeatureIds();
    this.mapFeatureIds.set(
      checked
        ? cur.includes(featureId)
          ? cur
          : [...cur, featureId]
        : cur.filter((id) => id !== featureId)
    );
  }

  toggleMapPermission(permissionId: string, checked: boolean): void {
    const cur = this.mapPermissionIds();
    this.mapPermissionIds.set(
      checked
        ? cur.includes(permissionId)
          ? cur
          : [...cur, permissionId]
        : cur.filter((id) => id !== permissionId)
    );
  }

  async savePlanFeatures(): Promise<void> {
    const planId = this.mapPlanId();
    if (!planId) return;
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.api.setPlanFeatures(planId, this.mapFeatureIds());
      this.message.set('Plan features saved.');
    } catch (e) {
      this.error.set(asError(e, 'Could not save plan features.'));
    } finally {
      this.busy.set(false);
    }
  }

  async saveFeaturePermissions(): Promise<void> {
    const featureId = this.mapFeatureId();
    if (!featureId) return;
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.api.setFeaturePermissions(featureId, this.mapPermissionIds());
      this.message.set('Feature permissions saved.');
    } catch (e) {
      this.error.set(asError(e, 'Could not save feature permissions.'));
    } finally {
      this.busy.set(false);
    }
  }

  async deleteFeature(id: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.deleteFeature(id);
      this.message.set('Feature deleted.');
      await this.load();
    } catch (e) {
      this.error.set(asError(e, 'Could not delete feature.'));
    } finally {
      this.busy.set(false);
    }
  }

  async deletePermission(id: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.deletePermission(id);
      this.message.set('Permission deleted.');
      await this.load();
    } catch (e) {
      this.error.set(asError(e, 'Could not delete permission.'));
    } finally {
      this.busy.set(false);
    }
  }
}

function asError(e: unknown, fallback: string): NormalizedError {
  return e && typeof e === 'object' && 'message' in e
    ? (e as NormalizedError)
    : { code: 'unknown', message: fallback };
}
