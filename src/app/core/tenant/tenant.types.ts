export interface Tenant {
  id: string;
  name: string;
}

export interface TenantMembership {
  tenant_id: string;
  role: 'owner' | 'member';
  tenants?: Tenant[];
}
