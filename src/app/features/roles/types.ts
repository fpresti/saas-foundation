export type TenantRoleItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
  permissionCodes: string[];
};

export type PermissionCatalogItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type RolesTab = 'roles' | 'role-permissions' | 'permissions';

export type RoleTableRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  systemLabel: string;
  permissionsLabel: string;
} & Record<string, unknown>;

export type PermissionTableRow = {
  id: string;
  code: string;
  name: string;
  description: string;
} & Record<string, unknown>;
