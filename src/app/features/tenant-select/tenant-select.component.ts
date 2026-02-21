import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TenantStore } from '../../core/tenant/tenant.store';
import {
  DataTableComponent,
  type DataTableColumn,
  type DataTableAction,
} from '../../shared/components/data-table';

type TenantRow = {
  id: string;
  name: string;
  role: string;
  status: string;
};

@Component({
  selector: 'app-tenant-select',
  standalone: true,
  imports: [RouterLink, DataTableComponent],
  templateUrl: './tenant-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantSelectComponent {
  private readonly router = inject(Router);
  private readonly tenantStore = inject(TenantStore);

  readonly tenants = computed(() => this.tenantStore.availableTenants());
  readonly activeId = computed(
    () => this.tenantStore.activeTenant()?.id ?? null,
  );
  readonly isLoading = this.tenantStore.isLoading;
  readonly error = this.tenantStore.error;

  readonly rows = computed<TenantRow[]>(() => {
    const list = this.tenants();
    const active = this.activeId();
    return list.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      role: tenant.role ?? '',
      status: tenant.id === active ? 'Active' : '',
    }));
  });

  readonly columns: DataTableColumn<TenantRow>[] = [
    { key: 'name', header: 'Tenant' },
    { key: 'role', header: 'Role' },
    { key: 'status', header: 'Status', hideOnMobile: true },
  ];

  readonly actions: DataTableAction<TenantRow>[] = [
    {
      id: 'select',
      label: 'Select',
      kind: 'primary',
      onClick: (row) => this.selectTenant(row.id),
      disabled: (row) => row.status === 'Active',
    },
    {
      id: 'test',
      label: 'Test',
      kind: 'neutral',
      onClick: () => alert('test'),
      disabled: () => false,
    }
  ];

  async selectTenant(id: string): Promise<void> {
    this.tenantStore.setActiveTenant(id);
    await this.router.navigateByUrl('/');
  }
}
