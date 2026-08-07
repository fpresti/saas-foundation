export type OwnProfile = {
  userId: string;
  givenName: string | null;
  familyName: string | null;
  avatarUrl: string | null;
};

export function formatDisplayName(
  givenName: string | null | undefined,
  familyName: string | null | undefined
): string {
  return [givenName, familyName]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}
