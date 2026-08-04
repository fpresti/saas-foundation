import { MEMBERS_PERMISSION } from './members.permissions';

describe('MEMBERS_PERMISSION', () => {
  it('uses roles.assign for manage roles', () => {
    expect(MEMBERS_PERMISSION.manageRoles).toBe('roles.assign');
  });
});
