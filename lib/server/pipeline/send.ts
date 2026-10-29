import 'server-only'
import { Resend } from 'resend'
import { BRIEF_BRANCHES } from '@/content/site'
import { SUBSCRIBER_BRIEF } from '@/content/sources'
import { siteUrl } from '@/lib/siteUrl'
import { db, istDate, type BriefRow } from '../db'
import { loadBundle, renderBrief } from '../email'

export type SendResult = { sent: Record<string, number>; skipped: string[]; errors: string[] }

// Sends one brief to every active subscriber of its branch. The brief is marked
// sent before mailing starts, so a retry can never email anyone twice.
export async function sendBrief(briefId: number, allowDraft = false): Promise<number> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) throw new Error('RESEND_API_KEY and EMAIL_FROM must be set')
  const sb = db()
  const allowed = allowDraft ? ['approved', 'draft'] : ['approved']
  const { data: claimed, error } = await sb.from('briefs').update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', briefId).in('status', allowed).select('*').maybeSingle()
  if (error) throw new Error(error.message)
  if (!claimed) throw new Error('Brief is not approved, or was already sent')
  const brief = claimed as BriefRow

  const branches = Object.entries(SUBSCRIBER_BRIEF).filter(([, b]) => b === brief.branch).map(([s]) => s)
  const bundle = await loadBundle(brief)
  const resend = new Resend(key)
  let sent = 0
  let failure: string | null = null

  // Page through subscribers 500 at a time, sending in batches of 100.
  for (let from_ = 0; ; from_ += 500) {
    const { data: subs, error: subErr } = await sb.from('waitlist').select('email, unsubscribe_token')
      .eq('status', 'active').in('branch', branches).order('id').range(from_, from_ + 499)
    if (subErr) { failure = subErr.message; break }
    if (!subs?.length) break
    for (let i = 0; i < subs.length; i += 100) {
      const batch = subs.slice(i, i + 100).map(s => {
        const unsub = siteUrl(`/unsubscribe?t=${s.unsubscribe_token}`)
        const { subject, html, text } = renderBrief(bundle, unsub)
        return {
          from, to: [s.email], subject, html, text,
          headers: { 'List-Unsubscribe': `<${siteUrl(`/api/unsubscribe?t=${s.unsubscribe_token}`)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }
      })
      const { error: sendErr } = await resend.batch.send(batch)
      if (sendErr) { failure = sendErr.message; break }
      sent += batch.length
    }
    if (failure || subs.length < 500) break
  }

  await sb.from('briefs').update({ recipients: sent }).eq('id', brief.id)
  if (failure) throw new Error(`Sent to ${sent} before failing: ${failure}`)
  return sent
}

// Cron entry: sends today's approved briefs. With AUTO_SEND_DRAFTS=true, drafts go too.
export async function sendToday(): Promise<SendResult> {
  const result: SendResult = { sent: {}, skipped: [], errors: [] }
  const allowDraft = process.env.AUTO_SEND_DRAFTS === 'true'
  const { data } = await db().from('briefs').select('id, branch, status').eq('brief_date', istDate())
  for (const branch of BRIEF_BRANCHES) {
    const b = data?.find(r => r.branch === branch)
    if (!b || !(b.status === 'approved' || (allowDraft && b.status === 'draft'))) {
      result.skipped.push(`${branch}${b ? ` (${b.status})` : ' (no brief)'}`)
      continue
    }
    try {
      result.sent[branch] = await sendBrief(b.id, allowDraft)
    } catch (e) {
      result.errors.push(`${branch}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return result
}
