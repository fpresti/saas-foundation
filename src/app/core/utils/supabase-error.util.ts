import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

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

function messageFromBody(body: unknown): string | null {
  const record = body as { error?: string; message?: string } | null;
  const bodyMessage = record?.error ?? record?.message;
  return typeof bodyMessage === 'string' && bodyMessage.trim()
    ? bodyMessage.trim()
    : null;
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

/**
 * Edge Functions return { error: string } in the body on 4xx/5xx.
 * The Supabase client puts that body on FunctionsHttpError.context (not `data`).
 */
export async function extractEdgeFunctionError(
  error: unknown,
  data: unknown,
  fallback = 'Request failed.'
): Promise<NormalizedError> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      const bodyMessage = messageFromBody(body);
      if (bodyMessage) {
        return { code: 'edge_function', message: bodyMessage };
      }
    } catch {
      // Response body not JSON — fall through.
    }
  }

  const dataMessage = messageFromBody(data);
  if (dataMessage) {
    return { code: 'edge_function', message: dataMessage };
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return { code: error.name, message: error.message };
  }

  const normalized = normalizeError(error);
  if (normalized) return normalized;

  if (error && typeof error === 'object' && 'message' in error) {
    return {
      code: 'unknown',
      message: String((error as { message: unknown }).message),
    };
  }

  return { code: 'unknown', message: fallback };
}
