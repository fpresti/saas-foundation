import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Database } from '../../../types/supabase';

let singleton: SupabaseClient<Database> | null = null;

/**
 * Creates a browser Supabase client (typed with generated Database).
 * Prefer using {@link SupabaseService} via DI so the app shares one instance.
 */
export function createSupabaseBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Single shared client for the app (Angular environment).
 * Used only by {@link SupabaseService}; do not call from features or components.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!singleton) {
    singleton = createSupabaseBrowserClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }
  return singleton;
}
