import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { siteUrl } from '@/lib/siteUrl'

export const dynamic = 'force-dynamic'

const KINDS = ['job', 'news', 'skill', 'affiliate', 'sponsor'] as const
type Kind = (typeof KINDS)[number]

// Tracked link. The destination is always looked up from the database by id,
// never taken from the query string, so this can't be used as an open redirect.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const kind = q.get('k') as Kind
  const i = Number(q.get('i'))
  const briefId = q.get('b') ? Number(q.get('b')) : null
  const home = NextResponse.redirect(siteUrl('/'), 302)
  const sb = supabaseAdmin()
  if (!sb || !KINDS.includes(kind) || !Number.isInteger(i) || i < 0) return home

  let url: string | null = null
  let branch: string | null = null
  if (kind === 'job') url = (await sb.from('jobs').select('url').eq('id', i).maybeSingle()).data?.url ?? null
  if (kind === 'affiliate') url = (await sb.from('affiliate_offers').select('url').eq('id', i).maybeSingle()).data?.url ?? null
  if (kind === 'sponsor') url = (await sb.from('sponsors').select('url').eq('id', i).maybeSingle()).data?.url ?? null
  if (briefId && Number.isInteger(briefId)) {
    const brief = (await sb.from('briefs').select('branch, skill, news').eq('id', briefId).maybeSingle()).data
    branch = brief?.branch ?? null
    if (kind === 'news') url = brief?.news?.[i]?.url ?? null
    if (kind === 'skill') url = brief?.skill?.resource_url ?? null
  }
  if (!url || !/^https?:\/\//.test(url)) return home

  await sb.from('clicks').insert({ kind, target: url.slice(0, 1000), brief_id: briefId && Number.isInteger(briefId) ? briefId : null, branch })
  return NextResponse.redirect(url, 302)
}
