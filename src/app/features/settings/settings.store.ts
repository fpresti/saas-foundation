import { computed, inject, Injectable, signal } from '@angular/core';
import { PermissionService } from '../../core/auth/permission.service';
import { SessionStore } from '../../core/auth/session.store';
import { AppResetService } from '../../core/services/app-reset.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import {
  SettingsService,
  type PlanOption,
  type TenantSettings,
  type TenantSubscriptionInfo,
} from './settings.service';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly settingsService = inject(SettingsService);
  private readonly permission = inject(PermissionService);
  private readonly sessionStore = inject(SessionStore);
  private readonly appReset = inject(AppResetService);

  readonly tenant = signal<TenantSettings | null>(null);
  readonly subscription = signal<TenantSubscriptionInfo | null>(null);
  readonly plans = signal<PlanOption[]>([]);
  readonly selectedPlanId = signal('');
  readonly planBusy = signal(false);
  readonly planError = signal<string | null>(null);
  readonly planMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly hasTenant = computed(() => this.tenant() !== null);
  readonly isOwner = computed(
    () => this.sessionStore.accessContext()?.tenant_role === 'owner'
  );

  constructor() {
    this.appReset.registerResettable('settings', this);
  }

  reset(): void {
    this.tenant.set(null);
    this.subscription.set(null);
    this.plans.set([]);
    this.selectedPlanId.set('');
    this.planError.set(null);
    this.planMessage.set(null);
    this.error.set(null);
  }

  async load(tenantId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.planError.set(null);
    this.planMessage.set(null);
    try {
      const [tenant, subscription, plans] = await Promise.all([
        this.settingsService.getTenant(tenantId),
        this.settingsService.getSubscription(tenantId),
        this.settingsService.listPlans(),
      ]);
      this.tenant.set(tenant);
      this.subscription.set(subscription);
      this.plans.set(plans);
      this.selectedPlanId.set(subscription?.planId ?? '');
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Could not load settings.' };
      this.error.set(normalized);
      this.tenant.set(null);
      this.subscription.set(null);
      this.plans.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async changePlan(tenantId: string): Promise<void> {
    const planId = this.selectedPlanId();
    if (!planId || !this.isOwner()) return;
    if (planId === this.subscription()?.planId) {
      this.planMessage.set('Already on this plan.');
      return;
    }

    this.planBusy.set(true);
    this.planError.set(null);
    this.planMessage.set(null);
    try {
      await this.settingsService.changePlan(tenantId, planId);
      this.permission.clearCache();
      const subscription = await this.settingsService.getSubscription(tenantId);
      this.subscription.set(subscription);
      this.selectedPlanId.set(subscription?.planId ?? planId);
      this.planMessage.set('Plan updated.');
    } catch (e: unknown) {
      this.planError.set(
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Could not change plan.'
      );
    } finally {
      this.planBusy.set(false);
    }
  }
}
