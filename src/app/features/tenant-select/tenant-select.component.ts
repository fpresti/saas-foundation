import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TenantStore } from '../../core/tenant/tenant.store';

@Component({
  selector: 'app-tenant-select',
  standalone: true,
  templateUrl: './tenant-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantSelectComponent {
  private readonly router = inject(Router);
  readonly tenantStore = inject(TenantStore);

  async selectTenant(tenantId: string): Promise<void> {
    this.tenantStore.setActiveTenant(tenantId);
    await this.router.navigateByUrl('/');
  }
}
