import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function unsubscribe(token: string | null): Promise<boolean> {
  const sb = supabaseAdmin()
  if (!sb || !token || !UUID.test(token)) return false
  const { data } = await sb.from('waitlist').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token).select('id')
  return !!data?.length
}
