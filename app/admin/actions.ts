'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { BRIEF_BRANCHES, type BriefBranch } from '@/content/site'
import { SESSION_COOKIE, checkCredentials, createSession } from '@/lib/server/auth'
import { requireAdmin } from '@/lib/server/requireAdmin'
import { db, type BriefRow } from '@/lib/server/db'
import { refreshJobs } from '@/lib/server/pipeline/jobs'
import { fetchNews } from '@/lib/server/pipeline/news'
import { composeBrief, composeBriefs } from '@/lib/server/pipeline/briefs'
import { sendBrief, sendToday } from '@/lib/server/pipeline/send'
import { loadBundle, renderBrief } from '@/lib/server/email'

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const num = (f: FormData, k: string) => {
  const n = Number(f.get(k))
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Bad ${k}`)
  return n
}
const list = (f: FormData, k: string) => str(f, k).split(',').map(s => s.trim()).filter(Boolean)
const httpsUrl = (u: string) => {
  try { return new URL(u).protocol === 'https:' ? u : null } catch { return null }
}
const back = (path: string, msg: string): never => redirect(`${path}${path.includes('?') ? '&' : '?'}msg=${encodeURIComponent(msg.slice(0, 600))}`)
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ---------- session ----------

export async function login(formData: FormData) {
  if (!(await checkCredentials(str(formData, 'email'), String(formData.get('password') ?? '')))) {
    redirect('/admin/login?error=1')
  }
  const { value, maxAge } = await createSession()
  cookies().set(SESSION_COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge })
  redirect('/admin')
}

export async function logout() {
  cookies().delete(SESSION_COOKIE)
  redirect('/admin/login')
}

// ---------- pipeline ----------

export async function runStep(formData: FormData) {
  await requireAdmin()
  const step = str(formData, 'step')
  let summary = ''
  try {
    if (step === 'jobs') {
      const r = await refreshJobs()
      summary = `Jobs: read ${r.sources} sources, saw ${r.seen} postings, added ${r.added}, closed ${r.closed}.${r.errors.length ? ` Errors: ${r.errors.join('; ')}` : ''}`
    } else if (step === 'news') {
      const r = await fetchNews()
      summary = `News: read ${r.feeds} feeds, stored ${r.stored} new stories.${r.errors.length ? ` Errors: ${r.errors.join('; ')}` : ''}`
    } else if (step === 'briefs') {
      const r = await composeBriefs()
      summary = `Briefs: drafted ${r.created.join(', ') || 'none'}; already had ${r.skipped.join(', ') || 'none'}.${r.errors.length ? ` Errors: ${r.errors.join('; ')}` : ''}`
    } else if (step === 'send') {
      const r = await sendToday()
      summary = `Send: ${Object.entries(r.sent).map(([b, n]) => `${b} to ${n}`).join(', ') || 'nothing sent'}; skipped ${r.skipped.join(', ') || 'none'}.${r.errors.length ? ` Errors: ${r.errors.join('; ')}` : ''}`
    } else {
      summary = 'Unknown step'
    }
  } catch (e) {
    summary = `Failed: ${errText(e)}`
  }
  revalidatePath('/admin', 'layout')
  back('/admin', summary)
}

// ---------- briefs ----------

export async function saveBrief(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const sb = db()
  const { data: current } = await sb.from('briefs').select('skill, news, status').eq('id', id).single()
  if (!current || current.status === 'sent') back(`/admin/briefs/${id}`, 'Sent briefs can’t be edited.')
  const rawUrl = str(formData, 'resource_url')
  const resourceUrl = rawUrl ? httpsUrl(rawUrl) : null
  if (rawUrl && !resourceUrl) back(`/admin/briefs/${id}`, 'The resource link must start with https://')
  const news = (current!.news as BriefRow['news'])
    .map((n, i) => ({ ...n, why: str(formData, `why_${i}`) || n.why }))
    .filter((_, i) => formData.get(`drop_${i}`) !== 'on')
  const { error } = await sb.from('briefs').update({
    subject: str(formData, 'subject').slice(0, 150),
    intro: str(formData, 'intro'),
    scam_note: str(formData, 'scam_note'),
    skill: {
      ...(current!.skill as BriefRow['skill']),
      title: str(formData, 'skill_title'), detail: str(formData, 'skill_detail'),
      resource_name: str(formData, 'resource_name'), resource_url: resourceUrl,
    },
    news,
  }).eq('id', id)
  revalidatePath(`/admin/briefs/${id}`)
  back(`/admin/briefs/${id}`, error ? `Save failed: ${error.message}` : 'Saved.')
}

export async function setBriefStatus(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const status = str(formData, 'status')
  if (!['draft', 'approved', 'skipped'].includes(status)) throw new Error('Bad status')
  const { error } = await db().from('briefs').update({ status }).eq('id', id).neq('status', 'sent')
  revalidatePath('/admin', 'layout')
  back(`/admin/briefs/${id}`, error ? error.message : `Marked ${status}.`)
}

export async function sendBriefNow(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  let msg: string
  try {
    msg = `Sent to ${await sendBrief(id, true)} subscribers.`
  } catch (e) {
    msg = `Send failed: ${errText(e)}`
  }
  revalidatePath('/admin', 'layout')
  back(`/admin/briefs/${id}`, msg)
}

export async function testBrief(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const to = process.env.ADMIN_EMAIL
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!to || !key || !from) back(`/admin/briefs/${id}`, 'Set ADMIN_EMAIL, RESEND_API_KEY and EMAIL_FROM to send tests.')
  const { data } = await db().from('briefs').select('*').eq('id', id).single()
  const { subject, html, text } = renderBrief(await loadBundle(data as BriefRow), '#')
  const { error } = await new Resend(key!).emails.send({ from: from!, to: [to!], subject: `[Test] ${subject}`, html, text })
  back(`/admin/briefs/${id}`, error ? `Test failed: ${error.message}` : `Test sent to ${to}.`)
}

export async function regenerateBrief(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const { data } = await db().from('briefs').select('branch, brief_date, status').eq('id', id).single()
  if (!data || data.status === 'sent') back(`/admin/briefs/${id}`, 'Sent briefs can’t be rewritten.')
  let msg = 'Rewritten as a new draft.'
  try {
    await composeBrief(data!.branch as BriefBranch, data!.brief_date)
  } catch (e) {
    msg = `Rewrite failed: ${errText(e)}`
  }
  revalidatePath(`/admin/briefs/${id}`)
  back(`/admin/briefs/${id}`, msg)
}

export async function draftBranch(formData: FormData) {
  await requireAdmin()
  const branch = BRIEF_BRANCHES.find(b => b === str(formData, 'branch'))
  if (!branch) throw new Error('Bad branch')
  let id: number | null = null
  let msg = ''
  try {
    id = await composeBrief(branch)
  } catch (e) {
    msg = `Draft failed: ${errText(e)}`
  }
  if (id) redirect(`/admin/briefs/${id}`)
  back('/admin', msg)
}

// ---------- jobs ----------

export async function setJobStatus(formData: FormData) {
  await requireAdmin()
  const status = str(formData, 'status')
  if (!['live', 'rejected', 'closed', 'pending'].includes(status)) throw new Error('Bad status')
  await db().from('jobs').update({ status, last_checked: new Date().toISOString() }).eq('id', num(formData, 'id'))
  revalidatePath('/admin/jobs'); revalidatePath('/jobs'); revalidatePath('/')
}

export async function featureJob(formData: FormData) {
  await requireAdmin()
  const days = Number(str(formData, 'days'))
  const until = days > 0 ? new Date(Date.now() + days * 86400_000).toISOString() : null
  await db().from('jobs').update({ featured_until: until }).eq('id', num(formData, 'id'))
  revalidatePath('/admin/jobs'); revalidatePath('/jobs'); revalidatePath('/')
}

export async function addJob(formData: FormData) {
  await requireAdmin()
  const url = httpsUrl(str(formData, 'url'))
  const branches = BRIEF_BRANCHES.filter(b => formData.getAll('branches').includes(b))
  if (!url || !str(formData, 'title') || !str(formData, 'company') || !branches.length) {
    back('/admin/jobs', 'A job needs a title, company, https link to the official posting and at least one branch.')
  }
  const { error } = await db().from('jobs').insert({
    title: str(formData, 'title'), company: str(formData, 'company'), location: str(formData, 'location'), url,
    salary: str(formData, 'salary') || null, tags: list(formData, 'tags'), branches, status: 'live', origin: 'admin',
  })
  revalidatePath('/jobs'); revalidatePath('/')
  back('/admin/jobs', error ? error.message : 'Job added and live.')
}

export async function addSource(formData: FormData) {
  await requireAdmin()
  const provider = str(formData, 'provider')
  const board = str(formData, 'board')
  if (!['greenhouse', 'lever', 'ashby'].includes(provider) || !/^[A-Za-z0-9._-]{1,80}$/.test(board) || !str(formData, 'company')) {
    back('/admin/jobs', 'A source needs a provider, a board name (letters, numbers, dots, dashes) and a company name.')
  }
  const { error } = await db().from('job_sources').insert({ provider, board, company: str(formData, 'company') })
  back('/admin/jobs', error ? error.message : 'Source added. It will be read on the next run.')
}

export async function toggleSource(formData: FormData) {
  await requireAdmin()
  await db().from('job_sources').update({ active: str(formData, 'active') === 'true' }).eq('id', num(formData, 'id'))
  revalidatePath('/admin/jobs')
}

// ---------- offers and sponsors ----------

export async function addOffer(formData: FormData) {
  await requireAdmin()
  const url = httpsUrl(str(formData, 'url'))
  if (!url || !str(formData, 'program') || !str(formData, 'title') || !list(formData, 'skill_tags').length) {
    back('/admin/offers', 'An offer needs a program, title, https affiliate link and at least one skill tag.')
  }
  const { error } = await db().from('affiliate_offers').insert({
    program: str(formData, 'program'), title: str(formData, 'title'), url,
    skill_tags: list(formData, 'skill_tags').map(t => t.toLowerCase()),
    branches: BRIEF_BRANCHES.filter(b => formData.getAll('branches').includes(b)),
    price_note: str(formData, 'price_note') || null,
  })
  back('/admin/offers', error ? error.message : 'Offer added.')
}

export async function toggleOffer(formData: FormData) {
  await requireAdmin()
  await db().from('affiliate_offers').update({ active: str(formData, 'active') === 'true' }).eq('id', num(formData, 'id'))
  revalidatePath('/admin/offers')
}

export async function addSponsor(formData: FormData) {
  await requireAdmin()
  const url = httpsUrl(str(formData, 'url'))
  const branch = str(formData, 'branch')
  const starts = str(formData, 'starts_on')
  const ends = str(formData, 'ends_on')
  if (!url || !str(formData, 'name') || !str(formData, 'message') || ![...BRIEF_BRANCHES, 'ALL'].includes(branch) || !starts || !ends || ends < starts) {
    back('/admin/sponsors', 'A sponsor needs a name, message, https link, branch and a valid date range.')
  }
  const { error } = await db().from('sponsors').insert({
    name: str(formData, 'name'), message: str(formData, 'message').slice(0, 300), url, branch, starts_on: starts, ends_on: ends,
  })
  back('/admin/sponsors', error ? error.message : 'Sponsor booked. It will appear in briefs drafted in that date range.')
}

export async function toggleSponsor(formData: FormData) {
  await requireAdmin()
  await db().from('sponsors').update({ active: str(formData, 'active') === 'true' }).eq('id', num(formData, 'id'))
  revalidatePath('/admin/sponsors')
}

// ---------- scam reports ----------

export async function setReport(formData: FormData) {
  await requireAdmin()
  const status = str(formData, 'status')
  if (!['new', 'published', 'dismissed'].includes(status)) throw new Error('Bad status')
  await db().from('scam_reports').update({ status, public_note: str(formData, 'public_note') || null }).eq('id', num(formData, 'id'))
  revalidatePath('/admin/reports')
}
