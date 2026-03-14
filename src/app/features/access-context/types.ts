/**
 * Re-exports app access-context types from the shared type layer.
 * Prefer importing from `src/types/access-context.types.ts` in new code.
 */
export type {
  AccessContext,
  AccessContextStatus,
  AllowedTenant,
} from '../../../types/access-context.types';
