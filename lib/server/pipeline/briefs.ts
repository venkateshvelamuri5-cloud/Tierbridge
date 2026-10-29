import 'server-only'
import { z } from 'zod'
import { BRIEF_BRANCHES, type BriefBranch } from '@/content/site'
import { askClaude, claudeReady } from '../claude'
import { db, istDate, isFeatured, type JobRow, type OfferRow, type SponsorRow } from '../db'

const BriefSchema = z.object({
  subject: z.string().describe('Email subject, under 70 characters, specific and not clickbait'),
  intro: z.string().describe('One or two friendly sentences opening the brief'),
  skill: z.object({
    title: z.string().describe('A skill a student can practise in about 5 minutes today'),
    detail: z.string().describe('3 to 5 sentences: what it is, why it matters for jobs in this branch, and the exact first step'),
    resource_name: z.string().describe('Name of one free, well-known learning resource for this skill'),
    resource_url: z.string().describe('Official https URL of that resource (documentation home page or a well-known free course). Never invent deep links.'),
    tags: z.array(z.string()).describe('2 to 4 lowercase skill keywords, e.g. "python", "autocad", "verilog"'),
  }),
  news: z.array(z.object({
    index: z.number().int().describe('Index of the chosen candidate story'),
    why: z.string().describe('One or two sentences on why this matters to a student in this branch'),
  })).describe('Exactly 3 stories from the candidates, most useful first'),
  scam_note: z.string().describe('One sentence of practical advice for spotting job scams aimed at Indian freshers. Vary it day to day.'),
})

const BRANCH_NAMES: Record<BriefBranch, string> = {
  ECE: 'Electronics and Communication Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  CSE: 'Computer Science, IT, BCA and MCA',
}

// Drops resource links that don't load, so a made-up URL never reaches students.
async function checkUrl(url: string): Promise<string | null> {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    const res = await fetch(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000), cache: 'no-store' })
    return res.ok ? u.toString() : null
  } catch {
    return null
  }
}

export async function pickJobs(branch: BriefBranch, limit = 3): Promise<JobRow[]> {
  const { data } = await db().from('jobs').select('*').eq('status', 'live').contains('branches', [branch])
    .order('first_seen', { ascending: false }).limit(30)
  const rows = (data ?? []) as JobRow[]
  return [...rows.filter(isFeatured), ...rows.filter(j => !isFeatured(j))].slice(0, limit)
}

async function pickOffer(branch: BriefBranch, tags: string[]): Promise<OfferRow | null> {
  const { data } = await db().from('affiliate_offers').select('*').eq('active', true)
  const want = new Set(tags.map(t => t.toLowerCase()))
  const scored = ((data ?? []) as OfferRow[])
    .filter(o => !o.branches.length || o.branches.includes(branch))
    .map(o => ({ o, score: o.skill_tags.filter(t => want.has(t.toLowerCase())).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored[0]?.o ?? null
}

async function pickSponsor(branch: BriefBranch, date: string): Promise<SponsorRow | null> {
  const { data } = await db().from('sponsors').select('*').eq('active', true).in('branch', [branch, 'ALL'])
    .lte('starts_on', date).gte('ends_on', date).order('starts_on').limit(1)
  return (data?.[0] as SponsorRow) ?? null
}

export async function composeBrief(branch: BriefBranch, date = istDate()): Promise<number> {
  const sb = db()
  const since = new Date(Date.now() - 48 * 3600_000).toISOString()
  const { data: candidates } = await sb.from('news_items').select('title, url, source, snippet')
    .eq('feed_branch', branch).gte('fetched_at', since).order('published_at', { ascending: false, nullsFirst: false }).limit(25)
  const { data: recent } = await sb.from('briefs').select('skill').eq('branch', branch).order('brief_date', { ascending: false }).limit(14)
  const pastSkills = (recent ?? []).map(r => r.skill?.title).filter(Boolean)
  const { data: reports } = await sb.from('scam_reports').select('public_note').eq('status', 'published')
    .not('public_note', 'is', null).gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString()).order('created_at', { ascending: false }).limit(1)
  const report = reports?.[0]?.public_note as string | undefined
  const news = candidates ?? []

  const out = await askClaude({
    system: `You write TierBridge, a free daily email for ${BRANCH_NAMES[branch]} students in Indian engineering colleges, mostly in tier-2 and tier-3 cities. Goal: teach one practical skill and explain the news that matters for their careers. Write in plain, warm Indian English for a 19 to 22 year old. No hype, no emojis, no invented facts or numbers. Only pick stories from the candidates given.`,
    prompt: [
      `Write the brief for ${date}.`,
      pastSkills.length ? `Skills covered recently (do not repeat): ${pastSkills.join('; ')}` : '',
      report ? `Base the scam note on this scam our readers confirmed this week: ${report}` : '',
      news.length
        ? 'Candidate stories:\n' + news.map((n, i) => `${i}. ${n.title} (${n.source})\n   ${n.snippet.slice(0, 300)}`).join('\n')
        : 'There are no candidate stories today, so return an empty news list.',
    ].filter(Boolean).join('\n\n'),
    schema: BriefSchema,
  })

  const chosen = out.news.filter(n => news[n.index]).slice(0, 3).map(n => ({
    title: news[n.index].title, url: news[n.index].url, source: news[n.index].source, why: n.why,
  }))
  const skill = { ...out.skill, tags: out.skill.tags.map(t => t.toLowerCase()), resource_url: await checkUrl(out.skill.resource_url) }
  const [jobs, offer, sponsor] = await Promise.all([pickJobs(branch), pickOffer(branch, skill.tags), pickSponsor(branch, date)])

  const { data, error } = await sb.from('briefs').upsert({
    branch, brief_date: date, status: 'draft', subject: out.subject.slice(0, 150), intro: out.intro, skill, news: chosen,
    job_ids: jobs.map(j => j.id), affiliate_offer_id: offer?.id ?? null, sponsor_id: sponsor?.id ?? null, scam_note: out.scam_note,
  }, { onConflict: 'branch,brief_date' }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

export type BriefsResult = { created: string[]; skipped: string[]; errors: string[] }

// Drafts today's brief for every branch that doesn't have one yet.
export async function composeBriefs(): Promise<BriefsResult> {
  const result: BriefsResult = { created: [], skipped: [], errors: [] }
  if (!claudeReady()) {
    result.errors.push('ANTHROPIC_API_KEY is not set, so no briefs were written')
    return result
  }
  const date = istDate()
  const { data: existing } = await db().from('briefs').select('branch').eq('brief_date', date)
  const done = new Set((existing ?? []).map(r => r.branch))
  await Promise.all(BRIEF_BRANCHES.map(async branch => {
    if (done.has(branch)) return void result.skipped.push(branch)
    try {
      await composeBrief(branch, date)
      result.created.push(branch)
    } catch (e) {
      result.errors.push(`${branch}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }))
  return result
}
