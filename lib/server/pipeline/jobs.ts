import 'server-only'
import { z } from 'zod'
import { BRIEF_BRANCHES, type BriefBranch } from '@/content/site'
import { FRESHER_HINTS, SENIOR_HINTS } from '@/content/sources'
import { askClaude, claudeReady } from '../claude'
import { db } from '../db'

type Posting = { id: string; title: string; location: string; url: string }
type Source = { id: number; provider: 'greenhouse' | 'lever' | 'ashby'; board: string; company: string }

const INDIA = /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|ncr|gurugram|gurgaon|noida|kolkata|ahmedabad|kochi|coimbatore|jaipur|indore|chandigarh|remote)\b/i
const MAX_NEW_PER_RUN = 60

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`)
  return res.json()
}

// Public job board APIs. None of these need a key.
export async function fetchPostings(s: Source): Promise<Posting[]> {
  const board = encodeURIComponent(s.board)
  if (s.provider === 'greenhouse') {
    const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`)
    return (data.jobs ?? []).map((j: any) => ({ id: String(j.id), title: j.title ?? '', location: j.location?.name ?? '', url: j.absolute_url ?? '' }))
  }
  if (s.provider === 'lever') {
    const data = await getJson(`https://api.lever.co/v0/postings/${board}?mode=json`)
    return (Array.isArray(data) ? data : []).map((j: any) => ({
      id: String(j.id), title: j.text ?? '', url: j.hostedUrl ?? '',
      location: [...new Set([j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean))].join(', '),
    }))
  }
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${board}`)
  return (data.jobs ?? []).filter((j: any) => j.isListed !== false).map((j: any) => ({
    id: String(j.id), title: j.title ?? '', url: j.jobUrl ?? '',
    location: [j.location, ...(j.secondaryLocations ?? []).map((l: any) => l.location)].filter(Boolean).join(', '),
  }))
}

const BRANCH_WORDS: Record<BriefBranch, RegExp> = {
  CSE: /\b(software|developer|sde|backend|frontend|full[- ]?stack|data|cloud|devops|qa|test|web|mobile|android|ios|ml|ai|security|support engineer)\b/i,
  ECE: /\b(embedded|firmware|vlsi|fpga|asic|hardware|electronics|rf|pcb|silicon|verification|analog|semiconductor)\b/i,
  MECH: /\b(mechanical|cad|cae|manufacturing|production|design engineer|automotive|quality engineer|maintenance|hvac|thermal)\b/i,
  CIVIL: /\b(civil|site engineer|structural|construction|bim|quantity surveyor|highway|geotechnical)\b/i,
}

type Classified = { fresher: boolean; branches: BriefBranch[]; tags: string[] }

function guess(title: string): Classified {
  return {
    fresher: FRESHER_HINTS.test(title),
    branches: BRIEF_BRANCHES.filter(b => BRANCH_WORDS[b].test(title)),
    tags: [],
  }
}

const ClassifySchema = z.object({
  jobs: z.array(z.object({
    index: z.number().int(),
    fresher: z.boolean().describe('True if a final-year student or 0-1 year graduate could realistically be hired'),
    branches: z.array(z.enum(['ECE', 'MECH', 'CIVIL', 'CSE'])).describe('Engineering branches whose students fit this role; empty if none'),
    tags: z.array(z.string()).describe('Up to 4 short skill tags, e.g. "Java", "AutoCAD", "Verilog"'),
  })),
})

async function classify(items: { title: string; company: string; location: string }[]): Promise<Classified[]> {
  if (!items.length) return []
  if (!claudeReady()) return items.map(i => guess(i.title))
  const out = await askClaude({
    system: 'You sort job postings for a job board that serves engineering students and fresh graduates in India. Judge from the title, company and location only. Be strict about "fresher": roles asking for experience are not fresher roles.',
    prompt: 'Classify each job.\n\n' + items.map((i, n) => `${n}. ${i.title} | ${i.company} | ${i.location}`).join('\n'),
    schema: ClassifySchema,
  })
  return items.map((i, n) => {
    const c = out.jobs.find(j => j.index === n)
    return c ? { fresher: c.fresher, branches: c.branches, tags: c.tags.slice(0, 4) } : guess(i.title)
  })
}

export type JobsResult = { sources: number; seen: number; added: number; closed: number; errors: string[] }

// Reads every active job source, adds new fresher roles (pending admin approval
// unless AUTO_APPROVE_JOBS=true), refreshes ones still open and closes ones that disappeared.
export async function refreshJobs(): Promise<JobsResult> {
  const sb = db()
  const result: JobsResult = { sources: 0, seen: 0, added: 0, closed: 0, errors: [] }
  const { data: sources, error } = await sb.from('job_sources').select('id, provider, board, company').eq('active', true)
  if (error) throw new Error(error.message)
  const newStatus = process.env.AUTO_APPROVE_JOBS === 'true' ? 'live' : 'pending'
  const now = new Date().toISOString()
  let budget = MAX_NEW_PER_RUN

  for (const s of (sources ?? []) as Source[]) {
    result.sources++
    try {
      const postings = (await fetchPostings(s)).filter(p => p.url.startsWith('https://') && p.title)
      const prefix = `${s.provider}:${s.board}:`
      const { data: existing, error: exErr } = await sb.from('jobs').select('id, source_key, status').like('source_key', `${prefix}%`)
      if (exErr) throw new Error(exErr.message)
      const known = new Map((existing ?? []).map(r => [r.source_key as string, r]))
      const current = new Set(postings.map(p => prefix + p.id))
      result.seen += postings.length

      // Still open: mark checked.
      const stillOpen = (existing ?? []).filter(r => current.has(r.source_key) && (r.status === 'live' || r.status === 'pending')).map(r => r.id)
      if (stillOpen.length) await sb.from('jobs').update({ last_checked: now }).in('id', stillOpen)

      // Gone from the board: close.
      const gone = (existing ?? []).filter(r => !current.has(r.source_key) && (r.status === 'live' || r.status === 'pending')).map(r => r.id)
      if (gone.length) {
        await sb.from('jobs').update({ status: 'closed', last_checked: now }).in('id', gone)
        result.closed += gone.length
      }

      // New postings that could suit students in India.
      const fresh = postings
        .filter(p => !known.has(prefix + p.id) && INDIA.test(p.location) && !SENIOR_HINTS.test(p.title))
        .slice(0, budget)
      budget -= fresh.length
      const labels = await classify(fresh.map(p => ({ title: p.title, company: s.company, location: p.location })))
      // Postings that aren't fresher roles are stored as rejected so they aren't re-classified every day.
      const rows = fresh.map((p, i) => {
        const c = labels[i]
        return {
          source_key: prefix + p.id, title: p.title.slice(0, 200), company: s.company, location: p.location.slice(0, 200),
          url: p.url, branches: c.branches, tags: c.tags,
          status: c.fresher && c.branches.length ? newStatus : 'rejected', origin: 'pipeline', last_checked: now,
        }
      })
      if (rows.length) {
        const { error: insErr } = await sb.from('jobs').upsert(rows, { onConflict: 'source_key', ignoreDuplicates: true })
        if (insErr) throw new Error(insErr.message)
        result.added += rows.filter(r => r.status !== 'rejected').length
      }
      await sb.from('job_sources').update({ last_run_at: now, last_error: null }).eq('id', s.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`${s.company}: ${msg}`)
      await sb.from('job_sources').update({ last_run_at: now, last_error: msg.slice(0, 500) }).eq('id', s.id)
    }
  }

  // Admin-added jobs aren't on a board we read; close them after 30 days unchecked.
  const stale = new Date(Date.now() - 30 * 86400_000).toISOString()
  await sb.from('jobs').update({ status: 'closed' }).eq('origin', 'admin').eq('status', 'live').lt('last_checked', stale)
  return result
}
