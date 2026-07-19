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
import {
  DataTableComponent,
  type DataTableColumn,
  type DataTableAction,
} from '../../shared/components/data-table';
import { UserAvatarComponent } from '../app-shell/components/user-avatar.component';
import { type MemberTableRow } from './members.view-model';
import { MembersStore } from './members.store';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [DataTableComponent, FormsModule, DatePipe, UserAvatarComponent],
  templateUrl: './members.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersComponent {
  protected readonly session = inject(SessionStore);
  protected readonly store = inject(MembersStore);

  readonly reloadToken = signal(0);
  private loadGeneration = 0;

  readonly columns: DataTableColumn<MemberTableRow>[] = [
    {
      key: 'givenName',
      header: 'Nombre',
      avatarUrlKey: 'avatarUrl',
    },
    { key: 'familyName', header: 'Apellidos' },
    { key: 'email', header: 'Email' },
    { key: 'memberType', header: 'Member type', hideOnMobile: true },
    { key: 'statusLabel', header: 'Status', hideOnMobile: true },
    { key: 'rolesLabel', header: 'Roles', hideOnMobile: true },
  ];

  readonly actions: DataTableAction<MemberTableRow>[] = [
    {
      id: 'manage',
      label: 'Manage',
      kind: 'neutral',
      disabled: () => !this.store.canManageMembers() && !this.store.canManageRoles(),
      onClick: (row) => this.openManage(row),
    },
  ];

  constructor() {
    effect(() => {
      const tenantId = this.session.activeTenantId();
      this.reloadToken();
      const gen = ++this.loadGeneration;

      if (!tenantId) {
        untracked(() => this.store.reset());
        return;
      }

      let cancelled = false;
      void this.store.load(tenantId).then(() => {
        if (cancelled || gen !== this.loadGeneration) return;
      });
      return () => {
        cancelled = true;
      };
    });
  }

  retryLoad(): void {
    this.reloadToken.update((n) => n + 1);
  }

  openInvite(): void {
    this.store.openInvite();
  }

  closeInvite(): void {
    this.store.closeInvite();
  }

  async submitInvite(): Promise<void> {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    await this.store.submitInvite(tenantId);
  }

  async resendInvitation(invitationId: string): Promise<void> {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    await this.store.resendPendingInvitation(tenantId, invitationId);
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    await this.store.revokePendingInvitation(tenantId, invitationId);
  }

  openManage(row: MemberTableRow): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    this.store.openManage(row, tenantId);
  }

  closeManage(): void {
    this.store.closeManage();
  }

  onManageAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.onManageAvatarSelected(input.files?.[0] ?? null);
  }

  clearManageAvatar(input: HTMLInputElement): void {
    this.store.onManageAvatarSelected(null);
    input.value = '';
  }

  async submitManage(): Promise<void> {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    await this.store.submitManage(tenantId);
  }
}
