import { FunctionsHttpError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { extractEdgeFunctionError } from './supabase-error.util';

describe('extractEdgeFunctionError', () => {
  it('reads error message from FunctionsHttpError.context', async () => {
    const response = new Response(
      JSON.stringify({ error: 'User already belongs to this tenant' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
    const httpError = new FunctionsHttpError(response);

    const result = await extractEdgeFunctionError(
      httpError,
      null,
      'Invitation failed.'
    );

    expect(result.message).toBe('User already belongs to this tenant');
    expect(result.code).toBe('edge_function');
  });

  it('falls back to data body when provided', async () => {
    const result = await extractEdgeFunctionError(
      { message: 'Edge Function returned a non-2xx status code' },
      { error: 'User already belongs to this tenant' },
      'Invitation failed.'
    );

    expect(result.message).toBe('User already belongs to this tenant');
  });

  it('falls back to invoke error message when body has no error', async () => {
    const result = await extractEdgeFunctionError(
      { message: 'Network error' },
      null,
      'Invitation failed.'
    );

    expect(result.message).toBe('Network error');
  });

  it('uses fallback when nothing else is available', async () => {
    const result = await extractEdgeFunctionError(null, null, 'Invitation failed.');

    expect(result.message).toBe('Invitation failed.');
  });
});
