import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { TenantOnboardingService } from '../../core/tenant/tenant-onboarding.service';
import { SessionStore } from '../../core/auth/session.store';

@Component({
  selector: 'app-onboarding-create-tenant',
  standalone: true,
  templateUrl: './onboarding-create-tenant.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule]
})
export class OnboardingCreateTenantComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tenantOnboarding = inject(TenantOnboardingService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<NormalizedError | null>(null);

  readonly form = this.fb.nonNullable.group({
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    taxId: ['', [Validators.required, Validators.minLength(5)]]
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    const { organizationName, taxId } = this.form.getRawValue();
    const result = await this.tenantOnboarding.createTenantWithOwner(
      organizationName,
      taxId
    );
    this.loading.set(false);
    if (result.error) {
      this.error.set(result.error);
      return;
    }
    await this.sessionStore.loadAccessContext();
    this.router.navigateByUrl('/');
  }

  /** Friendly message for tax_id uniqueness or other RPC errors. */
  errorMessage(err: NormalizedError): string {
    const code = (err.code ?? '').toLowerCase();
    const msg = (err.message ?? '').toLowerCase();
    if (
      code === 'unique_violation' ||
      msg.includes('tax_id') ||
      msg.includes('already exists')
    ) {
      return 'This tax ID is already registered. Please use a different one.';
    }
    return err.message;
  }
}
