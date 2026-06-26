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
import { type MemberTableRow } from './members.view-model';
import { MembersStore } from './members.store';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [DataTableComponent, FormsModule, DatePipe],
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
      disabled: () => !this.store.canManageRoles(),
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

  copyToken(): void {
    const t = this.store.inviteResult()?.token;
    if (t) void navigator.clipboard.writeText(t);
  }

  openManage(row: MemberTableRow): void {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    this.store.openManage(row, tenantId);
  }

  closeManage(): void {
    this.store.closeManage();
  }

  async submitAssignRole(): Promise<void> {
    const tenantId = this.session.activeTenantId();
    if (!tenantId) return;
    await this.store.submitAssignRole(tenantId);
  }
}
