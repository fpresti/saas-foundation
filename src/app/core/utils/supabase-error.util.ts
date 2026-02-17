/** Normalized error shape. Never expose raw Supabase errors to UI. */
export interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
}

/** Supabase auth APIs return error objects with optional code and message. */
function hasCodeAndMessage(
  err: unknown
): err is { code?: string; message?: string } {
  return typeof err === 'object' && err !== null;
}

export function normalizeAuthError(err: unknown): NormalizedError | null {
  if (err == null) return null;
  if (!hasCodeAndMessage(err)) return null;
  return {
    code: typeof err.code === 'string' ? err.code : 'unknown',
    message: typeof err.message === 'string' ? err.message : 'An error occurred',
    details: err
  };
}

/** Normalize any Supabase/Postgrest error for tenant and other features. */
export function normalizeError(err: unknown): NormalizedError | null {
  if (err == null) return null;
  if (!hasCodeAndMessage(err)) return null;
  return {
    code: typeof err.code === 'string' ? err.code : 'unknown',
    message: typeof err.message === 'string' ? err.message : 'An error occurred',
    details: err
  };
}
