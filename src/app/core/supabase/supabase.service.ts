import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase';
import { getSupabaseClient } from './supabase.client';

/**
 * Typed Supabase client for the browser app. Inject this service; do not call
 * createClient or getSupabaseClient from components or feature code.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** Shared typed client (Database schema). */
  readonly client: SupabaseClient<Database> = getSupabaseClient();
}
