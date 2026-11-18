'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

let client: SupabaseClient<any, 'tb', any> | null = null;

export function db() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: 'tb' },
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tierbridge-auth' },
    });
  }
  return client;
}

export function must<T>(res: { data: T; error: any }): T {
  if (res.error) throw res.error;
  return res.data;
}

export function friendly(e: any): string {
  const m: string = e?.message || String(e);
  if (/Invalid login credentials/i.test(m)) return 'That login ID or password is wrong.';
  if (/payments_check/.test(m)) return 'Enter the UTR or reference number (at least 6 characters) for UPI and bank payments.';
  if (/duplicate key/.test(m)) return 'That already exists.';
  if (/row-level security/i.test(m)) return 'You are not allowed to do that.';
  if (/Failed to fetch/i.test(m)) return 'Could not reach the server. Check your connection and try again.';
  return m;
}
