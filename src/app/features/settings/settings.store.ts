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
  readonly portalBusy = signal(false);
  readonly planError = signal<string | null>(null);
  readonly planMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly hasTenant = computed(() => this.tenant() !== null);
  readonly isOwner = computed(
    () => this.sessionStore.accessContext()?.tenant_role === 'owner'
  );
  readonly canOpenPortal = computed(
    () => this.isOwner() && !!this.subscription()?.billingCustomerId
  );
  /** Owner on a Stripe-priced plan but not yet linked to a Stripe customer. */
  readonly needsBillingSetup = computed(() => {
    if (!this.isOwner()) return false;
    const sub = this.subscription();
    if (!sub || sub.billingCustomerId) return false;
    const plan = this.plans().find((p) => p.id === sub.planId);
    return !!plan?.providerPriceId;
  });
  readonly statusWarning = computed(() => {
    const status = this.subscription()?.status;
    if (status === 'past_due') {
      return 'Payment is past due. Features may be limited for non-owners until billing is fixed.';
    }
    if (status === 'canceled') {
      return 'Subscription is canceled. Features may be limited for non-owners.';
    }
    return null;
  });

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
    this.portalBusy.set(false);
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

    const plan = this.plans().find((p) => p.id === planId);
    const samePlan = planId === this.subscription()?.planId;

    // Same plan without Stripe link → start Checkout to attach billing.
    if (samePlan && plan?.providerPriceId && !this.subscription()?.billingCustomerId) {
      await this.startCheckout(tenantId, planId);
      return;
    }

    if (samePlan) {
      this.planMessage.set('Already on this plan.');
      return;
    }

    if (plan?.providerPriceId) {
      await this.startCheckout(tenantId, planId);
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

  /** Explicit CTA when current plan has a Stripe price but no customer yet. */
  async setupBilling(tenantId: string): Promise<void> {
    const planId = this.subscription()?.planId;
    if (!planId || !this.needsBillingSetup()) return;
    await this.startCheckout(tenantId, planId);
  }

  private async startCheckout(tenantId: string, planId: string): Promise<void> {
    this.planBusy.set(true);
    this.planError.set(null);
    this.planMessage.set(null);
    try {
      const origin = globalThis.location?.origin ?? '';
      const url = await this.settingsService.createCheckoutSession({
        tenantId,
        planId,
        successUrl: `${origin}/settings?checkout=success`,
        cancelUrl: `${origin}/settings?checkout=cancel`,
      });
      globalThis.location.assign(url);
    } catch (e: unknown) {
      this.planError.set(
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Could not start Checkout.'
      );
      this.planBusy.set(false);
    }
  }

  async openBillingPortal(tenantId: string): Promise<void> {
    if (!this.canOpenPortal()) return;
    this.portalBusy.set(true);
    this.planError.set(null);
    try {
      const origin = globalThis.location?.origin ?? '';
      const url = await this.settingsService.createPortalSession({
        tenantId,
        returnUrl: `${origin}/settings`,
      });
      globalThis.location.assign(url);
    } catch (e: unknown) {
      this.planError.set(
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Could not open billing portal.'
      );
      this.portalBusy.set(false);
    }
  }

  formatPeriodEnd(iso: string | null | undefined): string | null {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }
}
