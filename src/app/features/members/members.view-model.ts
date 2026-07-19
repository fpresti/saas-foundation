/**
 * Page-level view model for the Members list. Built from tenant_members,
 * profiles, tenant_member_roles and roles — not raw Supabase row shapes.
 */
export interface MemberListItem {
  userId: string;
  email: string | null;
  givenName: string | null;
  familyName: string | null;
  avatarUrl: string | null;
  memberType: 'owner' | 'member';
  active: boolean;
  roleNames: string[];
  roleCodes: string[];
}

/** Row shape for {@link DataTableComponent} (stable id + display strings). */
export type MemberTableRow = {
  id: string;
  avatarUrl: string | null;
  givenName: string;
  familyName: string;
  email: string;
  memberType: string;
  statusLabel: string;
  rolesLabel: string;
  active: boolean;
} & Record<string, unknown>;

export function toMemberTableRow(item: MemberListItem): MemberTableRow {
  return {
    id: item.userId,
    avatarUrl: item.avatarUrl,
    givenName: item.givenName?.trim() || '—',
    familyName: item.familyName?.trim() || '—',
    email: item.email ?? '—',
    memberType: item.memberType,
    statusLabel: item.active ? 'Active' : 'Inactive',
    rolesLabel: item.roleNames.length > 0 ? item.roleNames.join(', ') : '—',
    active: item.active,
  } as MemberTableRow;
}
