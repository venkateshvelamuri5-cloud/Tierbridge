import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { isFeatured, type JobRow } from './db'

export function checkedLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

// Live jobs for the public site, featured first. Returns null when the database isn't set up.
export async function liveJobs(branch?: string, limit = 60): Promise<JobRow[] | null> {
  const sb = supabaseAdmin()
  if (!sb) return null
  let q = sb.from('jobs').select('*').eq('status', 'live').order('first_seen', { ascending: false }).limit(limit)
  if (branch) q = q.contains('branches', [branch])
  const { data, error } = await q
  if (error) return null
  const rows = (data ?? []) as JobRow[]
  return [...rows.filter(isFeatured), ...rows.filter(j => !isFeatured(j))]
}
