import Link from 'next/link'
import { BRIEF_BRANCHES } from '@/content/site'
import { SUBSCRIBER_BRIEF } from '@/content/sources'
import { db, istDate } from '@/lib/server/db'
import Notice from '@/components/admin/Notice'
import { draftBranch, runStep } from '../actions'

export const maxDuration = 300

const ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL', 'CRON_SECRET']

export default async function Dashboard({ searchParams }: { searchParams: { msg?: string } }) {
  const sb = db()
  const today = istDate()
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const [subs, briefs, recent, clicks, pending, live, reports] = await Promise.all([
    sb.from('waitlist').select('branch, status'),
    sb.from('briefs').select('id, branch, status, subject').eq('brief_date', today),
    sb.from('briefs').select('id, branch, brief_date, status, subject, recipients').order('brief_date', { ascending: false }).limit(12),
    sb.from('clicks').select('kind').gte('created_at', weekAgo),
    sb.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'live'),
    sb.from('scam_reports').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ])

  const active = (subs.data ?? []).filter(s => s.status === 'active')
  const byBrief = Object.fromEntries(BRIEF_BRANCHES.map(b => [b, active.filter(s => SUBSCRIBER_BRIEF[s.branch] === b).length]))
  const clickBy = (k: string) => (clicks.data ?? []).filter(c => c.kind === k).length
  const autoSend = process.env.AUTO_SEND_DRAFTS === 'true'

  return (
    <>
      <div className="head" style={{ marginBottom: 0 }}>
        <h1>Today · {today}</h1>
        <p className="muted">Jobs and news refresh around 5 AM IST and briefs are drafted right after. {autoSend ? 'Drafts send automatically at 7 AM (AUTO_SEND_DRAFTS is on).' : 'Approve each brief before 7 AM IST, or it won’t send.'}</p>
      </div>
      <Notice msg={searchParams.msg} />

      <div className="stats">
        <div className="stat"><b>{active.length}</b><span>Active subscribers</span></div>
        {BRIEF_BRANCHES.map(b => <div className="stat" key={b}><b>{byBrief[b]}</b><span>{b} readers</span></div>)}
        <div className="stat"><b>{clicks.data?.length ?? 0}</b><span>Clicks, last 7 days</span></div>
        <div className="stat"><b>{clickBy('affiliate')}</b><span>Affiliate clicks, 7 days</span></div>
        <div className="stat"><b>{clickBy('job')}</b><span>Job clicks, 7 days</span></div>
        <div className="stat"><Link href="/admin/jobs"><b>{pending.count ?? 0}</b></Link><span>Jobs waiting for review</span></div>
        <div className="stat"><b>{live.count ?? 0}</b><span>Live jobs</span></div>
        <div className="stat"><Link href="/admin/reports"><b>{reports.count ?? 0}</b></Link><span>New scam reports</span></div>
      </div>

      <section className="grid2">
        <div className="box" style={{ display: 'grid', gap: 12 }}>
          <h2>Today&apos;s briefs</h2>
          {BRIEF_BRANCHES.map(b => {
            const brief = briefs.data?.find(x => x.branch === b)
            return (
              <div key={b} className="row" style={{ background: 'var(--ink)' }}>
                <span><strong>{b}</strong> {brief ? <Link href={`/admin/briefs/${brief.id}`} style={{ color: 'var(--cyan)' }}>{brief.subject}</Link> : <span className="muted">Not drafted yet</span>}</span>
                {brief ? <span className={`pill ${brief.status}`}>{brief.status}</span> : (
                  <form action={draftBranch}><input type="hidden" name="branch" value={b} /><button className="sbtn" type="submit">Draft now</button></form>
                )}
              </div>
            )
          })}
        </div>

        <div className="box" style={{ display: 'grid', gap: 12 }}>
          <h2>Run by hand</h2>
          <p className="muted">These run automatically every day. Use them to test or catch up. Each can take a minute.</p>
          <div className="acts">
            {[['jobs', 'Refresh jobs'], ['news', 'Fetch news'], ['briefs', 'Draft briefs'], ['send', 'Send approved briefs']].map(([step, label]) => (
              <form key={step} action={runStep}><input type="hidden" name="step" value={step} /><button className={`sbtn${step === 'send' ? ' go' : ''}`} type="submit">{label}</button></form>
            ))}
          </div>
          <h2 style={{ marginTop: 8 }}>Setup</h2>
          <div className="acts">
            {ENV.map(k => <span key={k} className={`pill ${process.env[k] ? 'live' : 'pending'}`}>{process.env[k] ? '✓' : '✗'} {k}</span>)}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>Recent briefs</h2>
        <div className="scroll">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Branch</th><th>Subject</th><th>Status</th><th>Sent to</th></tr></thead>
            <tbody>
              {(recent.data ?? []).map(b => (
                <tr key={b.id}>
                  <td>{b.brief_date}</td><td>{b.branch}</td>
                  <td><Link href={`/admin/briefs/${b.id}`}>{b.subject}</Link></td>
                  <td><span className={`pill ${b.status}`}>{b.status}</span></td>
                  <td>{b.recipients ?? ''}</td>
                </tr>
              ))}
              {!recent.data?.length && <tr><td colSpan={5} className="muted">No briefs yet. Add job sources and an Anthropic key, then press “Draft briefs”.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
