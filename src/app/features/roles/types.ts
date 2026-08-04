export type TenantRoleItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
  permissionCodes: string[];
};

export type FeatureOption = {
  id: string;
  code: string;
  name: string;
};

export type PermissionCatalogItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  featureId: string | null;
  featureCode: string | null;
  featureName: string | null;
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
  feature: string;
  description: string;
  featureId: string | null;
} & Record<string, unknown>;
