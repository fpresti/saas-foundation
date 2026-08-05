import { computed, inject, Injectable, signal } from '@angular/core';
import { SessionStore } from '../../core/auth/session.store';
import { AppResetService } from '../../core/services/app-reset.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { FeaturesPlansService } from './features-plans.service';
import type {
  FeatureCatalogItem,
  FeatureTableRow,
  FeaturesPlansTab,
  PlanCatalogItem,
  PlanFeatureTableRow,
  PlanTableRow,
} from './types';

@Injectable({ providedIn: 'root' })
export class FeaturesPlansStore {
  private readonly api = inject(FeaturesPlansService);
  private readonly sessionStore = inject(SessionStore);
  private readonly appReset = inject(AppResetService);

  readonly tab = signal<FeaturesPlansTab>('plans');
  readonly plans = signal<PlanCatalogItem[]>([]);
  readonly features = signal<FeatureCatalogItem[]>([]);
  readonly isLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly message = signal<string | null>(null);

  readonly isSuperAdmin = computed(() => this.sessionStore.isSuperAdmin());

  readonly planRows = computed<PlanTableRow[]>(() =>
    this.plans().map((p) => ({
      id: p.id,
      name: p.name,
      priceLabel: formatPrice(p.price),
      stripePriceLabel: p.providerPriceId?.trim() || '—',
      description: p.description?.trim() || '—',
    }))
  );

  readonly planFeatureRows = computed<PlanFeatureTableRow[]>(() =>
    this.plans().map((p) => ({
      id: p.id,
      name: p.name,
      priceLabel: formatPrice(p.price),
      featuresLabel: p.featureCodes.length > 0 ? p.featureCodes.join(', ') : '—',
    }))
  );

  readonly featureRows = computed<FeatureTableRow[]>(() =>
    this.features().map((f) => ({
      id: f.id,
      code: f.code,
      name: f.name,
      description: f.description?.trim() || '—',
    }))
  );

  /** Plan editor */
  readonly planEditorOpen = signal(false);
  readonly planEditorMode = signal<'create' | 'edit'>('create');
  readonly planEditorId = signal<string | null>(null);
  readonly planEditorName = signal('');
  readonly planEditorPrice = signal('');
  readonly planEditorDescription = signal('');
  readonly planEditorProviderPriceId = signal('');
  readonly planEditorError = signal<string | null>(null);

  /** Plan↔features editor */
  readonly pfEditorOpen = signal(false);
  readonly pfEditorPlanId = signal<string | null>(null);
  readonly pfEditorPlanLabel = signal('');
  readonly pfEditorFeatureIds = signal<string[]>([]);
  readonly pfEditorError = signal<string | null>(null);

  /** Feature editor */
  readonly featureEditorOpen = signal(false);
  readonly featureEditorMode = signal<'create' | 'edit'>('create');
  readonly featureEditorId = signal<string | null>(null);
  readonly featureEditorCode = signal('');
  readonly featureEditorName = signal('');
  readonly featureEditorDescription = signal('');
  readonly featureEditorError = signal<string | null>(null);

  constructor() {
    this.appReset.registerResettable('features-plans', this);
  }

  reset(): void {
    this.plans.set([]);
    this.features.set([]);
    this.error.set(null);
    this.message.set(null);
    this.tab.set('plans');
    this.closePlanEditor();
    this.closePfEditor();
    this.closeFeatureEditor();
  }

  setTab(tab: FeaturesPlansTab): void {
    this.tab.set(tab);
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const [plans, features] = await Promise.all([
        this.api.listPlans(),
        this.api.listFeatures(),
      ]);
      this.plans.set(plans);
      this.features.set(features);
    } catch (e) {
      this.error.set(asError(e, 'Could not load features & plans.'));
      this.plans.set([]);
      this.features.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreatePlan(): void {
    this.planEditorMode.set('create');
    this.planEditorId.set(null);
    this.planEditorName.set('');
    this.planEditorPrice.set('');
    this.planEditorDescription.set('');
    this.planEditorProviderPriceId.set('');
    this.planEditorError.set(null);
    this.planEditorOpen.set(true);
  }

  openEditPlan(row: PlanTableRow): void {
    const plan = this.plans().find((p) => p.id === row.id);
    if (!plan) return;
    this.planEditorMode.set('edit');
    this.planEditorId.set(plan.id);
    this.planEditorName.set(plan.name);
    this.planEditorPrice.set(plan.price != null ? String(plan.price) : '');
    this.planEditorDescription.set(plan.description ?? '');
    this.planEditorProviderPriceId.set(plan.providerPriceId ?? '');
    this.planEditorError.set(null);
    this.planEditorOpen.set(true);
  }

  closePlanEditor(): void {
    this.planEditorOpen.set(false);
    this.planEditorId.set(null);
    this.planEditorError.set(null);
  }

  async savePlan(): Promise<void> {
    if (!this.isSuperAdmin()) return;
    const name = this.planEditorName().trim();
    if (!name) {
      this.planEditorError.set('Name is required.');
      return;
    }
    const priceRaw = this.planEditorPrice().trim();
    const price = priceRaw === '' ? null : Number(priceRaw);
    if (priceRaw !== '' && Number.isNaN(price)) {
      this.planEditorError.set('Invalid price.');
      return;
    }
    const providerPriceId = this.planEditorProviderPriceId().trim() || null;
    this.busy.set(true);
    this.planEditorError.set(null);
    try {
      if (this.planEditorMode() === 'create') {
        await this.api.createPlan({
          name,
          description: this.planEditorDescription().trim() || null,
          price,
          providerPriceId,
        });
      } else {
        const id = this.planEditorId();
        if (!id) return;
        await this.api.updatePlan({
          id,
          name,
          description: this.planEditorDescription().trim() || null,
          price,
          providerPriceId,
        });
      }
      this.closePlanEditor();
      this.message.set('Plan saved.');
      await this.load();
    } catch (e) {
      this.planEditorError.set(errorMessage(e, 'Could not save plan.'));
    } finally {
      this.busy.set(false);
    }
  }

  openPfEditor(row: { id: string; name: string }): void {
    const plan = this.plans().find((p) => p.id === row.id);
    if (!plan) return;
    this.pfEditorPlanId.set(plan.id);
    this.pfEditorPlanLabel.set(plan.name);
    this.pfEditorFeatureIds.set([...plan.featureIds]);
    this.pfEditorError.set(null);
    this.pfEditorOpen.set(true);
  }

  closePfEditor(): void {
    this.pfEditorOpen.set(false);
    this.pfEditorPlanId.set(null);
    this.pfEditorError.set(null);
  }

  togglePfFeature(featureId: string, checked: boolean): void {
    const cur = this.pfEditorFeatureIds();
    this.pfEditorFeatureIds.set(
      checked
        ? cur.includes(featureId)
          ? cur
          : [...cur, featureId]
        : cur.filter((id) => id !== featureId)
    );
  }

  async savePlanFeatures(): Promise<void> {
    if (!this.isSuperAdmin()) return;
    const planId = this.pfEditorPlanId();
    if (!planId) return;
    this.busy.set(true);
    this.pfEditorError.set(null);
    try {
      await this.api.setPlanFeatures(planId, this.pfEditorFeatureIds());
      this.closePfEditor();
      this.message.set('Plan features saved.');
      await this.load();
    } catch (e) {
      this.pfEditorError.set(errorMessage(e, 'Could not save plan features.'));
    } finally {
      this.busy.set(false);
    }
  }

  openCreateFeature(): void {
    this.featureEditorMode.set('create');
    this.featureEditorId.set(null);
    this.featureEditorCode.set('');
    this.featureEditorName.set('');
    this.featureEditorDescription.set('');
    this.featureEditorError.set(null);
    this.featureEditorOpen.set(true);
  }

  openEditFeature(row: FeatureTableRow): void {
    const f = this.features().find((x) => x.id === row.id);
    if (!f) return;
    this.featureEditorMode.set('edit');
    this.featureEditorId.set(f.id);
    this.featureEditorCode.set(f.code);
    this.featureEditorName.set(f.name);
    this.featureEditorDescription.set(f.description ?? '');
    this.featureEditorError.set(null);
    this.featureEditorOpen.set(true);
  }

  closeFeatureEditor(): void {
    this.featureEditorOpen.set(false);
    this.featureEditorId.set(null);
    this.featureEditorError.set(null);
  }

  async saveFeature(): Promise<void> {
    if (!this.isSuperAdmin()) return;
    const code = this.featureEditorCode().trim();
    const name = this.featureEditorName().trim();
    if (!code || !name) {
      this.featureEditorError.set('Code and name are required.');
      return;
    }
    this.busy.set(true);
    this.featureEditorError.set(null);
    try {
      if (this.featureEditorMode() === 'create') {
        await this.api.createFeature({
          code,
          name,
          description: this.featureEditorDescription().trim() || null,
        });
      } else {
        const id = this.featureEditorId();
        if (!id) return;
        await this.api.updateFeature({
          id,
          code,
          name,
          description: this.featureEditorDescription().trim() || null,
        });
      }
      this.closeFeatureEditor();
      this.message.set('Feature saved.');
      await this.load();
    } catch (e) {
      this.featureEditorError.set(errorMessage(e, 'Could not save feature.'));
    } finally {
      this.busy.set(false);
    }
  }

  async deleteFeature(row: FeatureTableRow): Promise<void> {
    if (!this.isSuperAdmin()) return;
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.api.deleteFeature(row.id);
      this.message.set('Feature deleted.');
      await this.load();
    } catch (e) {
      this.error.set(asError(e, 'Could not delete feature.'));
    } finally {
      this.busy.set(false);
    }
  }
}

function formatPrice(price: number | null): string {
  if (price == null) return '—';
  return price === 0 ? 'Free' : `$${price}`;
}

function asError(e: unknown, fallback: string): NormalizedError {
  return e && typeof e === 'object' && 'message' in e
    ? (e as NormalizedError)
    : { code: 'unknown', message: fallback };
}

function errorMessage(e: unknown, fallback: string): string {
  return typeof e === 'object' && e !== null && 'message' in e
    ? String((e as { message: unknown }).message)
    : fallback;
}
