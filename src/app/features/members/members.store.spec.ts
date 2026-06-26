import { TestBed } from '@angular/core/testing';
import { MembersStore } from './members.store';
import { MembersService } from './members.service';
import { PermissionService } from '../../core/auth/permission.service';
import { AppResetService } from '../../core/services/app-reset.service';
import { MEMBERS_PERMISSION } from './members.permissions';

describe('MembersStore', () => {
  let store: MembersStore;
  let membersService: {
    loadMembersForTenant: ReturnType<typeof vi.fn>;
    listPendingInvitations: ReturnType<typeof vi.fn>;
    createInvitation: ReturnType<typeof vi.fn>;
    listRolesForTenant: ReturnType<typeof vi.fn>;
    assignTenantUserRole: ReturnType<typeof vi.fn>;
  };
  let hasPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    membersService = {
      loadMembersForTenant: vi.fn().mockResolvedValue([]),
      listPendingInvitations: vi.fn().mockResolvedValue([]),
      createInvitation: vi.fn(),
      listRolesForTenant: vi.fn(),
      assignTenantUserRole: vi.fn(),
    };
    hasPermission = vi.fn().mockResolvedValue(false);

    TestBed.configureTestingModule({
      providers: [
        MembersStore,
        { provide: MembersService, useValue: membersService },
        { provide: PermissionService, useValue: { hasPermission } },
        { provide: AppResetService, useValue: { registerResettable: vi.fn() } },
      ],
    });

    store = TestBed.inject(MembersStore);
  });

  it('reset clears member state', () => {
    store.memberItems.set([
      {
        userId: 'u1',
        fullName: 'A',
        avatarUrl: null,
        memberType: 'member',
        roleNames: [],
        roleCodes: [],
      },
    ]);
    store.pendingInvitations.set([
      { id: 'inv-1', email: 'x@y.com', memberType: 'member', expiresAt: '2099-01-01' },
    ]);
    store.canInvite.set(true);
    store.canManageRoles.set(true);

    store.reset();

    expect(store.memberItems()).toEqual([]);
    expect(store.pendingInvitations()).toEqual([]);
    expect(store.canInvite()).toBe(false);
    expect(store.canManageRoles()).toBe(false);
  });

  it('load sets permissions and data', async () => {
    hasPermission.mockImplementation(async (code: string) => {
      if (code === MEMBERS_PERMISSION.invite) return true;
      if (code === MEMBERS_PERMISSION.manageRoles) return false;
      return false;
    });
    membersService.loadMembersForTenant.mockResolvedValue([
      {
        userId: 'u1',
        fullName: 'Owner',
        avatarUrl: null,
        memberType: 'owner',
        roleNames: ['Admin'],
        roleCodes: ['admin'],
      },
    ]);
    membersService.listPendingInvitations.mockResolvedValue([
      { id: 'inv-1', email: 'new@t.com', memberType: 'member', expiresAt: '2099-01-01' },
    ]);

    await store.load('tenant-abc');

    expect(store.canInvite()).toBe(true);
    expect(store.canManageRoles()).toBe(false);
    expect(store.memberItems()).toHaveLength(1);
    expect(store.pendingInvitations()).toHaveLength(1);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('submitInvite requires email', async () => {
    store.inviteEmail.set('  ');
    await store.submitInvite('tenant-abc');
    expect(store.inviteError()).toBe('Email required.');
    expect(membersService.createInvitation).not.toHaveBeenCalled();
  });
});
