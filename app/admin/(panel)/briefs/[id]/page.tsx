import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, type BriefRow } from '@/lib/server/db'
import { loadBundle, renderBrief } from '@/lib/server/email'
import Notice from '@/components/admin/Notice'
import { regenerateBrief, saveBrief, sendBriefNow, setBriefStatus, testBrief } from '../../../actions'

export const maxDuration = 300

export default async function BriefEditor({ params, searchParams }: { params: { id: string }; searchParams: { msg?: string } }) {
  if (!/^\d+$/.test(params.id)) notFound()
  const { data } = await db().from('briefs').select('*').eq('id', Number(params.id)).maybeSingle()
  if (!data) notFound()
  const b = data as BriefRow
  const bundle = await loadBundle(b)
  const { html } = renderBrief(bundle, '#')
  const locked = b.status === 'sent'
  const Hidden = () => <input type="hidden" name="id" value={b.id} />

  return (
    <>
      <div>
        <Link href="/admin" className="muted">← Today</Link>
        <h1 style={{ marginTop: 8 }}>{b.branch} brief · {b.brief_date} <span className={`pill ${b.status}`}>{b.status}</span></h1>
        {b.status === 'sent' && <p className="muted">Sent to {b.recipients ?? 0} subscribers at {b.sent_at ? new Date(b.sent_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}.</p>}
      </div>
      <Notice msg={searchParams.msg} />

      {!locked && (
        <div className="acts">
          {b.status !== 'approved' && <form action={setBriefStatus}><Hidden /><input type="hidden" name="status" value="approved" /><button className="sbtn go" type="submit">Approve for 7 AM</button></form>}
          {b.status === 'approved' && <form action={setBriefStatus}><Hidden /><input type="hidden" name="status" value="draft" /><button className="sbtn" type="submit">Back to draft</button></form>}
          <form action={testBrief}><Hidden /><button className="sbtn" type="submit">Send me a test</button></form>
          <form action={sendBriefNow}><Hidden /><button className="sbtn" type="submit">Send to everyone now</button></form>
          <form action={regenerateBrief}><Hidden /><button className="sbtn" type="submit">Rewrite with Claude</button></form>
          {b.status !== 'skipped' && <form action={setBriefStatus}><Hidden /><input type="hidden" name="status" value="skipped" /><button className="sbtn bad" type="submit">Skip today</button></form>}
        </div>
      )}

      <section className="grid2">
        <form action={saveBrief} className="form box" style={{ maxWidth: 'none' }}>
          <Hidden />
          <h2>Edit</h2>
          <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
            <label>Subject<input name="subject" defaultValue={b.subject} maxLength={150} required /></label>
            <label>Intro<textarea name="intro" defaultValue={b.intro} /></label>
            <label>Skill<input name="skill_title" defaultValue={b.skill.title} required /></label>
            <label>Skill detail<textarea name="skill_detail" defaultValue={b.skill.detail} /></label>
            <label>Free resource name<input name="resource_name" defaultValue={b.skill.resource_name} /></label>
            <label>Free resource link {b.skill.resource_url ? '' : <span className="pill pending">Claude&apos;s link didn&apos;t load, add one</span>}
              <input name="resource_url" type="url" defaultValue={b.skill.resource_url ?? ''} placeholder="https://" />
            </label>
            {b.news.map((n, i) => (
              <label key={n.url}>News {i + 1}: <a href={n.url} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', fontWeight: 400 }}>{n.title}</a>
                <textarea name={`why_${i}`} defaultValue={n.why} style={{ minHeight: 70 }} />
                <span style={{ fontWeight: 400, fontSize: 14 }}><input type="checkbox" name={`drop_${i}`} style={{ width: 'auto' }} /> Remove this story</span>
              </label>
            ))}
            <label>Scam note<textarea name="scam_note" defaultValue={b.scam_note} style={{ minHeight: 70 }} /></label>
            <p className="muted" style={{ fontSize: 14 }}>
              Jobs: {bundle.jobs.length ? bundle.jobs.map(j => j.title).join(', ') : 'none live for this branch'}.{' '}
              Affiliate: {bundle.offer?.title ?? 'none matched today’s skill'}. Sponsor: {bundle.sponsor?.name ?? 'none booked'}.
            </p>
            <button className="btn primary" type="submit">Save changes</button>
          </fieldset>
        </form>
        <div style={{ display: 'grid', gap: 8 }}>
          <h2>Email preview</h2>
          <iframe className="preview" title="Email preview" srcDoc={html} sandbox="" />
        </div>
      </section>
    </>
  )
}
