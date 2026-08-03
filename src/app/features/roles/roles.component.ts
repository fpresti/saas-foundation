import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionStore } from '../../core/auth/session.store';
import {
  DataTableComponent,
  type DataTableAction,
  type DataTableColumn,
} from '../../shared/components/data-table';
import { RolesStore } from './roles.store';
import type { PermissionTableRow, RoleTableRow, RolesTab } from './types';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [DataTableComponent, FormsModule],
  templateUrl: './roles.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesComponent {
  readonly session = inject(SessionStore);
  readonly store = inject(RolesStore);

  readonly roleColumns: DataTableColumn<RoleTableRow>[] = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'systemLabel', header: 'Type', hideOnMobile: true },
    { key: 'description', header: 'Description', hideOnMobile: true },
  ];

  readonly rolePermColumns: DataTableColumn<RoleTableRow>[] = [
    { key: 'name', header: 'Role' },
    { key: 'code', header: 'Code', hideOnMobile: true },
    { key: 'permissionsLabel', header: 'Permissions' },
  ];

  readonly permissionColumns: DataTableColumn<PermissionTableRow>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description', hideOnMobile: true },
  ];

  readonly roleActions: DataTableAction<RoleTableRow>[] = [
    {
      id: 'edit',
      label: 'Edit',
      kind: 'neutral',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.store.openEditRole(row),
    },
    {
      id: 'delete',
      label: 'Delete',
      kind: 'danger',
      disabled: (row) => !this.store.isSuperAdmin() || row.systemLabel === 'system',
      onClick: (row) => this.deleteRole(row),
    },
  ];

  readonly rolePermActions: DataTableAction<RoleTableRow>[] = [
    {
      id: 'edit-perms',
      label: 'Edit permissions',
      kind: 'neutral',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.store.openRpEditor(row),
    },
  ];

  readonly permissionActions: DataTableAction<PermissionTableRow>[] = [
    {
      id: 'edit',
      label: 'Edit',
      kind: 'neutral',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.store.openEditPermission(row),
    },
    {
      id: 'delete',
      label: 'Delete',
      kind: 'danger',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.deletePermission(row),
    },
  ];

  constructor() {
    effect(() => {
      const tenantId = this.session.activeTenantId();
      if (!tenantId) {
        untracked(() => this.store.reset());
        return;
      }
      void this.store.load(tenantId);
    });
  }

  setTab(tab: RolesTab): void {
    this.store.setTab(tab);
  }

  deleteRole(row: RoleTableRow): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.deleteRole(tenantId, row);
  }

  deletePermission(row: PermissionTableRow): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.deletePermission(tenantId, row);
  }

  saveRole(): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.saveRole(tenantId);
  }

  saveRolePermissions(): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.saveRolePermissions(tenantId);
  }

  savePermission(): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    void this.store.savePermission(tenantId);
  }
}
