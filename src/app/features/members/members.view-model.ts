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
  roleNames: string[];
  roleCodes: string[];
}

/** Row shape for {@link DataTableComponent} (stable id + display strings). */
export type MemberTableRow = {
  id: string;
  avatarUrl: string | null;
  displayName: string;
  email: string;
  memberType: string;
  rolesLabel: string;
} & Record<string, unknown>;

export function memberDisplayName(item: MemberListItem): string {
  const name = [item.givenName, item.familyName]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  return name || item.email || item.userId;
}

export function toMemberTableRow(item: MemberListItem): MemberTableRow {
  return {
    id: item.userId,
    avatarUrl: item.avatarUrl,
    displayName: memberDisplayName(item),
    email: item.email ?? '—',
    memberType: item.memberType,
    rolesLabel: item.roleNames.length > 0 ? item.roleNames.join(', ') : '—',
  } as MemberTableRow;
}
