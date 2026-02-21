import { Injectable } from '@angular/core';
import type { __Feature__Item } from '../types';

/**
 * __Feature__ feature service. All data access goes through here.
 * - Return Promises (no RxJS unless strictly necessary).
 * - Use RPC for critical writes (invitations, membership, subscription, etc.).
 * - Direct table access only for tenant-scoped reads or non-critical writes protected by RLS.
 */
@Injectable({ providedIn: 'root' })
export class __Feature__Service {
  /** List items. Replace with real Supabase/RPC call; respect tenant context. */
  async list(): Promise<__Feature__Item[]> {
    // TODO: e.g. await this.supabase.from('__feature__').select('*').eq('tenant_id', tenantId);
    return [];
  }

  /** Get one by id. */
  async getById(id: string): Promise<__Feature__Item | null> {
    // TODO: implement
    return null;
  }

  /** Create. Use RPC if this is a critical write. */
  async create(payload: Omit<__Feature__Item, 'id'>): Promise<__Feature__Item> {
    // TODO: implement; prefer RPC for critical writes
    throw new Error('Not implemented');
  }
}
