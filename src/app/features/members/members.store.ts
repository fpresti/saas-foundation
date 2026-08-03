import { computed, inject, Injectable, signal } from '@angular/core';
import { AppResetService } from '../../core/services/app-reset.service';
import { PermissionService } from '../../core/auth/permission.service';
import { SessionStore } from '../../core/auth/session.store';
import { ProfileService } from '../../core/profile/profile.service';
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
  private readonly profileService = inject(ProfileService);
  private readonly permission = inject(PermissionService);
  private readonly sessionStore = inject(SessionStore);
  private readonly appReset = inject(AppResetService);

  readonly memberItems = signal<MemberListItem[]>([]);
  readonly pendingInvitations = signal<PendingInvitation[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<NormalizedError | null>(null);
  readonly canInvite = signal(false);
  readonly canManageRoles = signal(false);
  readonly canManageMembers = computed(
    () => this.sessionStore.accessContext()?.tenant_role === 'owner'
  );

  readonly tableRows = computed(() => this.memberItems().map(toMemberTableRow));

  readonly inviteOpen = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteBusy = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteResult = signal<{ email: string; expiresAt: string } | null>(null);

  readonly pendingInvitationBusy = signal<Record<string, 'delete' | 'resend'>>({});
  readonly pendingInvitationMessage = signal<string | null>(null);

  readonly manageOpen = signal(false);
  readonly manageUserId = signal<string | null>(null);
  readonly manageUserLabel = signal('');
  readonly manageEmail = signal('');
  readonly manageGivenName = signal('');
  readonly manageFamilyName = signal('');
  readonly manageMemberType = signal<'owner' | 'member'>('member');
  readonly manageActive = signal(true);
  readonly manageAvatarUrl = signal<string | null>(null);
  readonly manageAvatarFile = signal<File | null>(null);
  readonly manageAvatarPreviewUrl = signal<string | null>(null);
  readonly tenantRoles = signal<TenantRoleOption[]>([]);
  readonly manageRoleIds = signal<string[]>([]);
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
    this.pendingInvitationBusy.set({});
    this.pendingInvitationMessage.set(null);
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
      });
      this.inviteResult.set({ email: res.email, expiresAt: res.expires_at });
      await this.load(tenantId);
    } catch (e: unknown) {
      this.inviteError.set(errorMessage(e, 'Invitation failed.'));
    } finally {
      this.inviteBusy.set(false);
    }
  }

  async revokePendingInvitation(tenantId: string, invitationId: string): Promise<void> {
    this.pendingInvitationMessage.set(null);
    this.pendingInvitationBusy.update((m) => ({ ...m, [invitationId]: 'delete' }));
    try {
      await this.membersService.revokeInvitation({ tenantId, invitationId });
      await this.load(tenantId);
    } catch (e: unknown) {
      this.pendingInvitationMessage.set(errorMessage(e, 'Could not delete invitation.'));
    } finally {
      this.pendingInvitationBusy.update((m) => {
        const next = { ...m };
        delete next[invitationId];
        return next;
      });
    }
  }

  async resendPendingInvitation(tenantId: string, invitationId: string): Promise<void> {
    this.pendingInvitationMessage.set(null);
    this.pendingInvitationBusy.update((m) => ({ ...m, [invitationId]: 'resend' }));
    try {
      await this.membersService.resendInvitation({ tenantId, invitationId });
      this.pendingInvitationMessage.set('Invitation email sent again.');
      await this.load(tenantId);
    } catch (e: unknown) {
      this.pendingInvitationMessage.set(errorMessage(e, 'Could not resend invitation.'));
    } finally {
      this.pendingInvitationBusy.update((m) => {
        const next = { ...m };
        delete next[invitationId];
        return next;
      });
    }
  }

  openManage(row: MemberTableRow, tenantId: string): void {
    const item = this.memberItems().find((m) => m.userId === row.id);
    this.clearManageAvatarPreview();
    this.manageError.set(null);
    this.manageUserId.set(row.id);
    this.manageUserLabel.set(
      [item?.givenName, item?.familyName].filter(Boolean).join(' ') || item?.email || row.id
    );
    this.manageEmail.set(item?.email ?? row.email);
    this.manageGivenName.set(item?.givenName ?? '');
    this.manageFamilyName.set(item?.familyName ?? '');
    this.manageMemberType.set(item?.memberType === 'owner' ? 'owner' : 'member');
    this.manageActive.set(item?.active ?? true);
    this.manageAvatarUrl.set(item?.avatarUrl ?? null);
    this.manageAvatarFile.set(null);
    this.manageRoleIds.set([...(item?.roleIds ?? [])]);
    this.manageOpen.set(true);

    if (this.canManageRoles()) {
      this.manageBusy.set(true);
      this.membersService
        .listRolesForTenant(tenantId)
        .then((roles) => {
          this.tenantRoles.set(roles);
        })
        .catch((e: unknown) => {
          this.manageError.set(errorMessage(e, 'Could not load roles.'));
          this.tenantRoles.set([]);
        })
        .finally(() => this.manageBusy.set(false));
    } else {
      this.tenantRoles.set([]);
    }
  }

  toggleManageRole(roleId: string, checked: boolean): void {
    const current = this.manageRoleIds();
    if (checked) {
      if (!current.includes(roleId)) {
        this.manageRoleIds.set([...current, roleId]);
      }
      return;
    }
    this.manageRoleIds.set(current.filter((id) => id !== roleId));
  }

  closeManage(): void {
    this.clearManageAvatarPreview();
    this.manageOpen.set(false);
    this.manageUserId.set(null);
  }

  onManageAvatarSelected(file: File | null): void {
    this.clearManageAvatarPreview();
    if (!file) {
      this.manageAvatarFile.set(null);
      return;
    }
    this.manageAvatarFile.set(file);
    this.manageAvatarPreviewUrl.set(URL.createObjectURL(file));
  }

  async submitManage(tenantId: string): Promise<void> {
    const userId = this.manageUserId();
    if (!userId) return;

    this.manageBusy.set(true);
    this.manageError.set(null);
    try {
      if (this.canManageMembers()) {
        let avatarUrl: string | undefined;
        const file = this.manageAvatarFile();
        if (file) {
          avatarUrl = await this.profileService.uploadAvatarForUser(userId, file);
        }

        await this.membersService.updateMemberProfile({
          tenantId,
          userId,
          givenName: this.manageGivenName(),
          familyName: this.manageFamilyName(),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        });

        await this.membersService.setMemberType({
          tenantId,
          userId,
          memberType: this.manageMemberType(),
        });

        await this.membersService.setMemberActive({
          tenantId,
          userId,
          active: this.manageActive(),
        });
      }

      if (this.canManageRoles() && this.manageMemberType() !== 'owner') {
        await this.membersService.setTenantMemberRoles({
          tenantId,
          userId,
          roleIds: this.manageRoleIds(),
        });
        this.permission.clearCache();
      }

      this.closeManage();
      await this.load(tenantId);
    } catch (e: unknown) {
      this.manageError.set(errorMessage(e, 'Could not save member.'));
    } finally {
      this.manageBusy.set(false);
    }
  }

  private clearManageAvatarPreview(): void {
    const preview = this.manageAvatarPreviewUrl();
    if (preview) URL.revokeObjectURL(preview);
    this.manageAvatarPreviewUrl.set(null);
  }
}

function errorMessage(e: unknown, fallback: string): string {
  return typeof e === 'object' && e !== null && 'message' in e
    ? String((e as { message: unknown }).message)
    : fallback;
}
