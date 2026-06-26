import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
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
  private readonly sessionStore = inject(SessionStore);

  readonly tenants = computed(() => this.sessionStore.allowedTenants());
  readonly activeId = computed(() => this.sessionStore.activeTenantId());
  readonly isLoading = computed(
    () => this.sessionStore.accessContextStatus() === 'loading'
  );
  readonly error = computed(() => this.sessionStore.accessContextError());

  readonly rows = computed<TenantRow[]>(() => {
    const list = this.tenants();
    const active = this.activeId();
    const ctx = this.sessionStore.accessContext();
    const roleFor = (id: string) =>
      id === ctx?.tenant_id ? (ctx.tenant_role ?? '') : '';
    return list.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      role: roleFor(tenant.id) || (ctx?.is_super_admin ? 'super_admin' : ''),
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
  ];

  async selectTenant(id: string): Promise<void> {
    await this.sessionStore.setActiveTenant(id);
    await this.router.navigateByUrl('/');
  }
}
