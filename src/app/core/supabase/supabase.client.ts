import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from './database.types';

let client: SupabaseClient<Database> | null = null;

/**
 * Single Supabase client source for the app. Uses environment variables.
 * Do not create additional Supabase instances in features.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }
  return client;
}
