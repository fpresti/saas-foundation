export interface Tenant {
  id: string;
  name: string;
  role?: 'owner' | 'member' | 'super_admin';
}

export interface TenantMembership {
  tenant_id: string;
  role: 'owner' | 'member';
  tenants?: Tenant[];
}
