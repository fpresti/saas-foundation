/**
 * Page-level view model for the Members list. Built from tenant_members,
 * profiles, tenant_member_roles and roles — not raw Supabase row shapes.
 */
export interface MemberListItem {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  memberType: 'owner' | 'member';
  roleNames: string[];
  roleCodes: string[];
}

/** Row shape for {@link DataTableComponent} (stable id + display strings). */
export type MemberTableRow = {
  id: string;
  displayName: string;
  memberType: string;
  rolesLabel: string;
} & Record<string, unknown>;

export function toMemberTableRow(item: MemberListItem): MemberTableRow {
  return {
    id: item.userId,
    displayName: item.fullName?.trim() || item.userId,
    memberType: item.memberType,
    rolesLabel:
      item.roleNames.length > 0 ? item.roleNames.join(', ') : '—',
  } as MemberTableRow;
}
