import { computed, inject, Injectable, signal } from '@angular/core';
import { SessionStore } from '../../core/auth/session.store';
import { AppResetService } from '../../core/services/app-reset.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { RolesService } from './roles.service';
import type {
  FeatureOption,
  PermissionCatalogItem,
  PermissionTableRow,
  RoleTableRow,
  RolesTab,
  TenantRoleItem,
} from './types';

@Injectable({ providedIn: 'root' })
export class RolesStore {
  private readonly rolesService = inject(RolesService);
  private readonly sessionStore = inject(SessionStore);
  private readonly appReset = inject(AppResetService);

  readonly tab = signal<RolesTab>('roles');
  readonly state = signal<TenantRoleItem[]>([]);
  readonly permissions = signal<PermissionCatalogItem[]>([]);
  readonly features = signal<FeatureOption[]>([]);
  readonly isLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly message = signal<string | null>(null);

  readonly isSuperAdmin = computed(() => this.sessionStore.isSuperAdmin());
  readonly roles = computed(() => this.state());

  readonly roleRows = computed<RoleTableRow[]>(() =>
    this.state().map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description?.trim() || '—',
      systemLabel: r.isSystem ? 'system' : 'custom',
      permissionsLabel:
        r.permissionCodes.length > 0 ? r.permissionCodes.join(', ') : '—',
    }))
  );

  readonly permissionRows = computed<PermissionTableRow[]>(() =>
    this.permissions().map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      feature: p.featureCode ?? '—',
      description: p.description?.trim() || '—',
      featureId: p.featureId,
    }))
  );

  /** Role editor */
  readonly roleEditorOpen = signal(false);
  readonly roleEditorMode = signal<'create' | 'edit'>('create');
  readonly roleEditorId = signal<string | null>(null);
  readonly roleEditorCode = signal('');
  readonly roleEditorName = signal('');
  readonly roleEditorDescription = signal('');
  readonly roleEditorError = signal<string | null>(null);

  /** Role↔permissions editor */
  readonly rpEditorOpen = signal(false);
  readonly rpEditorRoleId = signal<string | null>(null);
  readonly rpEditorRoleLabel = signal('');
  readonly rpEditorPermissionIds = signal<string[]>([]);
  readonly rpEditorError = signal<string | null>(null);

  /** Permission editor */
  readonly permEditorOpen = signal(false);
  readonly permEditorMode = signal<'create' | 'edit'>('create');
  readonly permEditorId = signal<string | null>(null);
  readonly permEditorFeatureId = signal('');
  readonly permEditorAction = signal('');
  readonly permEditorName = signal('');
  readonly permEditorDescription = signal('');
  readonly permEditorError = signal<string | null>(null);

  readonly permEditorCodePreview = computed(() => {
    const feature = this.features().find((f) => f.id === this.permEditorFeatureId());
    const action = this.permEditorAction().trim();
    if (!feature || !action) return '';
    return `${feature.code}.${action}`;
  });

  constructor() {
    this.appReset.registerResettable('roles', this);
  }

  reset(): void {
    this.state.set([]);
    this.permissions.set([]);
    this.features.set([]);
    this.error.set(null);
    this.message.set(null);
    this.tab.set('roles');
    this.closeRoleEditor();
    this.closeRpEditor();
    this.closePermEditor();
  }

  setTab(tab: RolesTab): void {
    if ((tab === 'role-permissions' || tab === 'permissions') && !this.isSuperAdmin()) {
      this.tab.set('roles');
      return;
    }
    this.tab.set(tab);
  }

  async load(tenantId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const sa = this.isSuperAdmin();
      const [roles, perms, features] = await Promise.all([
        this.rolesService.listForTenant(tenantId),
        sa
          ? this.rolesService.listPermissions()
          : Promise.resolve([] as PermissionCatalogItem[]),
        sa
          ? this.rolesService.listFeatures()
          : Promise.resolve([] as FeatureOption[]),
      ]);
      this.state.set(roles);
      this.permissions.set(perms);
      this.features.set(features);
      if (!sa && this.tab() !== 'roles') {
        this.tab.set('roles');
      }
    } catch (e) {
      this.error.set(asError(e, 'Could not load roles.'));
      this.state.set([]);
      this.permissions.set([]);
      this.features.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateRole(): void {
    this.roleEditorMode.set('create');
    this.roleEditorId.set(null);
    this.roleEditorCode.set('');
    this.roleEditorName.set('');
    this.roleEditorDescription.set('');
    this.roleEditorError.set(null);
    this.roleEditorOpen.set(true);
  }

  openEditRole(row: RoleTableRow): void {
    const role = this.state().find((r) => r.id === row.id);
    if (!role) return;
    this.roleEditorMode.set('edit');
    this.roleEditorId.set(role.id);
    this.roleEditorCode.set(role.code);
    this.roleEditorName.set(role.name);
    this.roleEditorDescription.set(role.description ?? '');
    this.roleEditorError.set(null);
    this.roleEditorOpen.set(true);
  }

  closeRoleEditor(): void {
    this.roleEditorOpen.set(false);
    this.roleEditorId.set(null);
    this.roleEditorError.set(null);
  }

  async saveRole(tenantId: string): Promise<void> {
    if (!this.isSuperAdmin()) return;
    const code = this.roleEditorCode().trim();
    const name = this.roleEditorName().trim();
    if (!code || !name) {
      this.roleEditorError.set('Code and name are required.');
      return;
    }
    this.busy.set(true);
    this.roleEditorError.set(null);
    try {
      if (this.roleEditorMode() === 'create') {
        await this.rolesService.createRole({
          tenantId,
          code,
          name,
          description: this.roleEditorDescription().trim() || null,
        });
      } else {
        const id = this.roleEditorId();
        if (!id) return;
        await this.rolesService.updateRole({
          roleId: id,
          code,
          name,
          description: this.roleEditorDescription().trim() || null,
        });
      }
      this.closeRoleEditor();
      this.message.set('Role saved.');
      await this.load(tenantId);
    } catch (e) {
      this.roleEditorError.set(errorMessage(e, 'Could not save role.'));
    } finally {
      this.busy.set(false);
    }
  }

  async deleteRole(tenantId: string, row: RoleTableRow): Promise<void> {
    if (!this.isSuperAdmin()) return;
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.rolesService.deleteRole(row.id);
      this.message.set('Role deleted.');
      await this.load(tenantId);
    } catch (e) {
      this.error.set(asError(e, 'Could not delete role.'));
    } finally {
      this.busy.set(false);
    }
  }

  openRpEditor(row: RoleTableRow): void {
    const role = this.state().find((r) => r.id === row.id);
    if (!role) return;
    this.rpEditorRoleId.set(role.id);
    this.rpEditorRoleLabel.set(`${role.name} (${role.code})`);
    this.rpEditorPermissionIds.set([...role.permissionIds]);
    this.rpEditorError.set(null);
    this.rpEditorOpen.set(true);
  }

  closeRpEditor(): void {
    this.rpEditorOpen.set(false);
    this.rpEditorRoleId.set(null);
    this.rpEditorError.set(null);
  }

  toggleRpPermission(permissionId: string, checked: boolean): void {
    const cur = this.rpEditorPermissionIds();
    this.rpEditorPermissionIds.set(
      checked
        ? cur.includes(permissionId)
          ? cur
          : [...cur, permissionId]
        : cur.filter((id) => id !== permissionId)
    );
  }

  async saveRolePermissions(tenantId: string): Promise<void> {
    if (!this.isSuperAdmin()) return;
    const roleId = this.rpEditorRoleId();
    if (!roleId) return;
    this.busy.set(true);
    this.rpEditorError.set(null);
    try {
      await this.rolesService.setRolePermissions(roleId, this.rpEditorPermissionIds());
      this.closeRpEditor();
      this.message.set('Role permissions saved.');
      await this.load(tenantId);
    } catch (e) {
      this.rpEditorError.set(errorMessage(e, 'Could not save role permissions.'));
    } finally {
      this.busy.set(false);
    }
  }

  openCreatePermission(): void {
    this.permEditorMode.set('create');
    this.permEditorId.set(null);
    this.permEditorFeatureId.set(this.features()[0]?.id ?? '');
    this.permEditorAction.set('');
    this.permEditorName.set('');
    this.permEditorDescription.set('');
    this.permEditorError.set(null);
    this.permEditorOpen.set(true);
  }

  openEditPermission(row: PermissionTableRow): void {
    const p = this.permissions().find((x) => x.id === row.id);
    if (!p) return;
    this.permEditorMode.set('edit');
    this.permEditorId.set(p.id);
    this.permEditorFeatureId.set(p.featureId ?? '');
    const featureCode = p.featureCode ?? '';
    const action =
      featureCode && p.code.startsWith(`${featureCode}.`)
        ? p.code.slice(featureCode.length + 1)
        : p.code.includes('.')
          ? p.code.split('.').slice(1).join('.')
          : p.code;
    this.permEditorAction.set(action);
    this.permEditorName.set(p.name);
    this.permEditorDescription.set(p.description ?? '');
    this.permEditorError.set(null);
    this.permEditorOpen.set(true);
  }

  closePermEditor(): void {
    this.permEditorOpen.set(false);
    this.permEditorId.set(null);
    this.permEditorError.set(null);
  }

  async savePermission(tenantId: string): Promise<void> {
    if (!this.isSuperAdmin()) return;
    const featureId = this.permEditorFeatureId();
    const action = this.permEditorAction().trim();
    const name = this.permEditorName().trim();
    const code = this.permEditorCodePreview();
    if (!featureId || !action || !name || !code) {
      this.permEditorError.set('Feature, action and name are required.');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(action)) {
      this.permEditorError.set(
        'Action must be lowercase letters, digits or underscore (e.g. read, permissions_read).'
      );
      return;
    }
    this.busy.set(true);
    this.permEditorError.set(null);
    try {
      if (this.permEditorMode() === 'create') {
        await this.rolesService.createPermission({
          code,
          name,
          description: this.permEditorDescription().trim() || null,
          featureId,
        });
      } else {
        const id = this.permEditorId();
        if (!id) return;
        await this.rolesService.updatePermission({
          id,
          code,
          name,
          description: this.permEditorDescription().trim() || null,
          featureId,
        });
      }
      this.closePermEditor();
      this.message.set('Permission saved.');
      await this.load(tenantId);
    } catch (e) {
      this.permEditorError.set(errorMessage(e, 'Could not save permission.'));
    } finally {
      this.busy.set(false);
    }
  }

  async deletePermission(tenantId: string, row: PermissionTableRow): Promise<void> {
    if (!this.isSuperAdmin()) return;
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.rolesService.deletePermission(row.id);
      this.message.set('Permission deleted.');
      await this.load(tenantId);
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

function errorMessage(e: unknown, fallback: string): string {
  return typeof e === 'object' && e !== null && 'message' in e
    ? String((e as { message: unknown }).message)
    : fallback;
}
