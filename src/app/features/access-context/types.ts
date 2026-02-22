/** Access context returned by RPC get_access_context. */
export interface AccessContext {
  is_super_admin: boolean;
  tenant_id: string | null;
  tenant_role: 'owner' | 'member' | null;
  tenant_status: string | null;
  allowed_tenants: AllowedTenant[];
}

export interface AllowedTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export type AccessContextStatus = 'idle' | 'loading' | 'ready' | 'error';
