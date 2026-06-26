import { MEMBERS_PERMISSION } from './members.permissions';

describe('MEMBERS_PERMISSION', () => {
  it('uses tenant.roles.assign for manage roles', () => {
    expect(MEMBERS_PERMISSION.manageRoles).toBe('tenant.roles.assign');
  });
});
