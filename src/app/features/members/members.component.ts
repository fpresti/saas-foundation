import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { SessionStore } from '../../core/auth/session.store';
import {
  DataTableComponent,
  type DataTableColumn,
  type DataTableAction,
} from '../../shared/components/data-table';
import { MembersService } from './members.service';
import {
  type MemberListItem,
  toMemberTableRow,
  type MemberTableRow,
} from './members.view-model';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [DataTableComponent],
  templateUrl: './members.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersComponent {
  protected readonly session = inject(SessionStore);
  private readonly membersService = inject(MembersService);

  readonly membersLoading = signal(false);
  readonly membersError = signal<string | null>(null);
  /** Raw view models (tenant reload, actions later). */
  readonly memberItems = signal<MemberListItem[]>([]);
  /** Table rows derived from {@link memberItems}. */
  readonly tableRows = signal<MemberTableRow[]>([]);

  private loadGeneration = 0;

  readonly columns: DataTableColumn<MemberTableRow>[] = [
    { key: 'displayName', header: 'Name' },
    { key: 'memberType', header: 'Member type', hideOnMobile: true },
    { key: 'rolesLabel', header: 'Roles', hideOnMobile: true },
  ];

  readonly actions: DataTableAction<MemberTableRow>[] = [
    {
      id: 'manage',
      label: 'Manage',
      kind: 'neutral',
      disabled: () => true,
      onClick: () => {},
    },
  ];

  constructor() {
    effect((onCleanup) => {
      const tenantId = this.session.activeTenantId();
      const gen = ++this.loadGeneration;

      if (!tenantId) {
        untracked(() => {
          this.membersLoading.set(false);
          this.membersError.set(null);
          this.memberItems.set([]);
          this.tableRows.set([]);
        });
        return;
      }

      untracked(() => {
        this.membersLoading.set(true);
        this.membersError.set(null);
      });

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      this.membersService
        .loadMembersForTenant(tenantId)
        .then((items) => {
          if (cancelled || gen !== this.loadGeneration) return;
          untracked(() => {
            this.memberItems.set(items);
            this.tableRows.set(items.map(toMemberTableRow));
            this.membersLoading.set(false);
            this.membersError.set(null);
          });
        })
        .catch((err: unknown) => {
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
        });
    });
  }
}
