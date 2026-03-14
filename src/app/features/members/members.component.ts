import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionStore } from '../../core/auth/session.store';
import { PermissionService } from '../../core/auth/permission.service';
import {
  DataTableComponent,
  type DataTableColumn,
  type DataTableAction,
} from '../../shared/components/data-table';
import { MembersService, type TenantRoleOption } from './members.service';
import {
  type MemberListItem,
  toMemberTableRow,
  type MemberTableRow,
} from './members.view-model';
import { MEMBERS_PERMISSION } from './members.permissions';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [DataTableComponent, FormsModule, DatePipe],
  templateUrl: './members.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersComponent {
  protected readonly session = inject(SessionStore);
  private readonly membersService = inject(MembersService);
  private readonly permission = inject(PermissionService);

  readonly membersLoading = signal(false);
  readonly membersError = signal<string | null>(null);
  readonly memberItems = signal<MemberListItem[]>([]);
  readonly tableRows = signal<MemberTableRow[]>([]);

  readonly canInvite = signal(false);
  readonly canManageRoles = signal(false);

  readonly reloadToken = signal(0);

  readonly inviteOpen = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteMemberType = signal<'member' | 'owner'>('member');
  readonly inviteBusy = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteResult = signal<{ token: string; expiresAt: string } | null>(
    null
  );

  readonly manageOpen = signal(false);
  readonly manageUserId = signal<string | null>(null);
  readonly manageUserLabel = signal('');
  readonly tenantRoles = signal<TenantRoleOption[]>([]);
  readonly manageRoleId = signal('');
  readonly manageBusy = signal(false);
  readonly manageError = signal<string | null>(null);

  private loadGeneration = 0;

  readonly columns: DataTableColumn<MemberTableRow>[] = [
    {
      key: 'displayName',
      header: 'Name',
      avatarUrlKey: 'avatarUrl',
    },
    { key: 'memberType', header: 'Member type', hideOnMobile: true },
    { key: 'rolesLabel', header: 'Roles', hideOnMobile: true },
  ];

  readonly actions: DataTableAction<MemberTableRow>[] = [
    {
      id: 'manage',
      label: 'Manage',
      kind: 'neutral',
      disabled: () => !this.canManageRoles(),
      onClick: (row) => this.openManage(row),
    },
  ];

  constructor() {
    effect(() => {
      const tenantId = this.session.activeTenantId();
      this.reloadToken();
      const gen = ++this.loadGeneration;

      if (!tenantId) {
        untracked(() => {
          this.membersLoading.set(false);
          this.membersError.set(null);
          this.memberItems.set([]);
          this.tableRows.set([]);
          this.canInvite.set(false);
          this.canManageRoles.set(false);
        });
        return;
      }

      untracked(() => {
        this.membersLoading.set(true);
        this.membersError.set(null);
      });

      let cancelled = false;
      const run = async () => {
        try {
          const [invite, manage, items] = await Promise.all([
            this.permission.hasPermission(MEMBERS_PERMISSION.invite),
            this.permission.hasPermission(MEMBERS_PERMISSION.manageRoles),
            this.membersService.loadMembersForTenant(tenantId),
          ]);
          if (cancelled || gen !== this.loadGeneration) return;
          untracked(() => {
            this.canInvite.set(invite);
            this.canManageRoles.set(manage);
            this.memberItems.set(items);
            this.tableRows.set(items.map(toMemberTableRow));
            this.membersLoading.set(false);
            this.membersError.set(null);
          });
        } catch (err: unknown) {
          if (cancelled || gen !== this.loadGeneration) return;
          const message =
            typeof err === 'object' &&
            err !== null &&
            'message' in err &&
            typeof (err as { message: unknown }).message === 'string'
              ? (err as { message: string }).message
              : 'Could not load members.';
          untracked(() => {
            this.memberItems.set([]);
            this.tableRows.set([]);
            this.membersLoading.set(false);
            this.membersError.set(message);
          });
        }
      };
      void run();
      return () => {
        cancelled = true;
      };
    });
  }

  retryLoad(): void {
    this.membersError.set(null);
    this.reloadToken.update((n) => n + 1);
  }

  openInvite(): void {
    this.inviteError.set(null);
    this.inviteResult.set(null);
    this.inviteEmail.set('');
    this.inviteMemberType.set('member');
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    this.inviteOpen.set(false);
  }

  async submitInvite(): Promise<void> {
    const tenantId = this.session.activeTenantId();
    const email = this.inviteEmail().trim();
    if (!tenantId || !email) {
      this.inviteError.set('Email required.');
      return;
    }
    this.inviteBusy.set(true);
    this.inviteError.set(null);
    this.inviteResult.set(null);
    try {
      const res = await this.membersService.createInvitation({
        tenantId,
        email,
        memberType: this.inviteMemberType(),
      });
      this.inviteResult.set({ token: res.token, expiresAt: res.expires_at });
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Invitation failed.';
      this.inviteError.set(msg);
    } finally {
      this.inviteBusy.set(false);
    }
  }

  copyToken(): void {
    const t = this.inviteResult()?.token;
    if (t) void navigator.clipboard.writeText(t);
  }

  openManage(row: MemberTableRow): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    this.manageError.set(null);
    this.manageUserId.set(row.id);
    this.manageUserLabel.set(row.displayName);
    this.manageRoleId.set('');
    this.manageOpen.set(true);
    this.manageBusy.set(true);
    this.membersService
      .listRolesForTenant(tenantId)
      .then((roles) => {
        this.tenantRoles.set(roles);
        if (roles.length && !this.manageRoleId()) {
          this.manageRoleId.set(roles[0]!.id);
        }
      })
      .catch((e: unknown) => {
        const msg =
          typeof e === 'object' &&
          e !== null &&
          'message' in e &&
          typeof (e as { message: unknown }).message === 'string'
            ? (e as { message: string }).message
            : 'Could not load roles.';
        this.manageError.set(msg);
        this.tenantRoles.set([]);
      })
      .finally(() => this.manageBusy.set(false));
  }

  closeManage(): void {
    this.manageOpen.set(false);
    this.manageUserId.set(null);
  }

  async submitAssignRole(): Promise<void> {
    const tenantId = this.session.activeTenantId();
    const userId = this.manageUserId();
    const roleId = this.manageRoleId();
    if (!tenantId || !userId || !roleId) return;
    this.manageBusy.set(true);
    this.manageError.set(null);
    try {
      await this.membersService.assignTenantUserRole({
        tenantId,
        userId,
        roleId,
      });
      this.closeManage();
      this.reloadToken.update((n) => n + 1);
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Could not assign role.';
      this.manageError.set(msg);
    } finally {
      this.manageBusy.set(false);
    }
  }

}
