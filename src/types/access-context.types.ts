/**
 * Frontend view models for RPC `get_access_context`.
 * Generated `Database['public']['Functions']['get_access_context']` types
 * `allowed_tenants` as Json; these types match the JSON payload built in SQL
 * (`jsonb_build_object('id', …, 'name', …, 'slug', …, 'status', …)`).
 */

/** One tenant entry inside `get_access_context.allowed_tenants` (RPC JSON). */
export interface AllowedTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

/**
 * Normalized access context for the app (single row from `get_access_context`).
 * `tenant_role` is narrowed where the RPC returns known role strings.
 */
export interface AccessContext {
  is_super_admin: boolean;
  tenant_id: string | null;
  tenant_role: 'owner' | 'member' | null;
  tenant_status: string | null;
  allowed_tenants: AllowedTenant[];
}

export type AccessContextStatus = 'idle' | 'loading' | 'ready' | 'error';
