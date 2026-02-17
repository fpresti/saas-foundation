import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

let client: SupabaseClient | null = null;

/**
 * Single Supabase client source for the app. Uses environment variables.
 * Do not create additional Supabase instances in features.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }
  return client;
}
