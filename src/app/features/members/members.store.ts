import { computed, inject, Injectable, signal } from '@angular/core';
import { AppResetService } from '../../core/services/app-reset.service';
import { PermissionService } from '../../core/auth/permission.service';
import type { NormalizedError } from '../../core/utils/supabase-error.util';
import { MEMBERS_PERMISSION } from './members.permissions';
import {
  MembersService,
  type PendingInvitation,
  type TenantRoleOption,
} from './members.service';
import {
  type MemberListItem,
  toMemberTableRow,
  type MemberTableRow,
} from './members.view-model';

@Injectable({ providedIn: 'root' })
export class MembersStore {
  private readonly membersService = inject(MembersService);
  private readonly permission = inject(PermissionService);
  private readonly appReset = inject(AppResetService);

  readonly memberItems = signal<MemberListItem[]>([]);
  readonly pendingInvitations = signal<PendingInvitation[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly canInvite = signal(false);
  readonly canManageRoles = signal(false);

  readonly tableRows = computed(() =>
    this.memberItems().map(toMemberTableRow)
  );

  readonly inviteOpen = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteMemberType = signal<'member' | 'owner'>('member');
  readonly inviteBusy = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteResult = signal<{ token: string; expiresAt: string } | null>(null);

  readonly manageOpen = signal(false);
  readonly manageUserId = signal<string | null>(null);
  readonly manageUserLabel = signal('');
  readonly tenantRoles = signal<TenantRoleOption[]>([]);
  readonly manageRoleId = signal('');
  readonly manageBusy = signal(false);
  readonly manageError = signal<string | null>(null);

  constructor() {
    this.appReset.registerResettable('members', this);
  }

  reset(): void {
    this.memberItems.set([]);
    this.pendingInvitations.set([]);
    this.error.set(null);
    this.canInvite.set(false);
    this.canManageRoles.set(false);
    this.closeInvite();
    this.closeManage();
  }

  async load(tenantId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const [invite, manage, items, pending] = await Promise.all([
        this.permission.hasPermission(MEMBERS_PERMISSION.invite),
        this.permission.hasPermission(MEMBERS_PERMISSION.manageRoles),
        this.membersService.loadMembersForTenant(tenantId),
        this.membersService.listPendingInvitations(tenantId),
      ]);
      this.canInvite.set(invite);
      this.canManageRoles.set(manage);
      this.memberItems.set(items);
      this.pendingInvitations.set(pending);
    } catch (e) {
      const normalized: NormalizedError =
        e && typeof e === 'object' && 'message' in e
          ? (e as NormalizedError)
          : { code: 'unknown', message: 'Could not load members.' };
      this.error.set(normalized);
      this.memberItems.set([]);
      this.pendingInvitations.set([]);
    } finally {
      this.isLoading.set(false);
    }
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

  async submitInvite(tenantId: string): Promise<void> {
    const email = this.inviteEmail().trim();
    if (!email) {
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
      await this.load(tenantId);
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Invitation failed.';
      this.inviteError.set(msg);
    } finally {
      this.inviteBusy.set(false);
    }
  }

  openManage(row: MemberTableRow, tenantId: string): void {
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
          typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
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

  async submitAssignRole(tenantId: string): Promise<void> {
    const userId = this.manageUserId();
    const roleId = this.manageRoleId();
    if (!userId || !roleId) return;
    this.manageBusy.set(true);
    this.manageError.set(null);
    try {
      await this.membersService.assignTenantUserRole({ tenantId, userId, roleId });
      this.closeManage();
      await this.load(tenantId);
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Could not assign role.';
      this.manageError.set(msg);
    } finally {
      this.manageBusy.set(false);
    }
  }
}
