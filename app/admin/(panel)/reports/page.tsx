import { db } from '@/lib/server/db'
import { setReport } from '../../actions'

export default async function Reports() {
  const { data } = await db().from('scam_reports').select('*').order('created_at', { ascending: false }).limit(200)
  return (
    <>
      <h1>Scam reports</h1>
      <p className="muted">Reports from the public form. Publish one with a short, factual note and the next morning&apos;s briefs use it for the scam watch section. Don&apos;t name a real company unless you&apos;ve confirmed the scam is impersonating it.</p>
      <div className="list">
        {(data ?? []).map(r => (
          <form key={r.id} action={setReport} className="box form" style={{ maxWidth: 'none' }}>
            <input type="hidden" name="id" value={r.id} />
            <div className="acts" style={{ justifyContent: 'space-between' }}>
              <span className="muted">{new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{r.reporter_email ? ` · ${r.reporter_email}` : ''}</span>
              <span className={`pill ${r.status}`}>{r.status}</span>
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{r.description}</p>
            {r.url && <p className="mono muted" style={{ wordBreak: 'break-all' }}>{r.url}</p>}
            <label>Note for students<input name="public_note" defaultValue={r.public_note ?? ''} placeholder="Fake ‘onboarding kit’ fee messages are going around on WhatsApp." /></label>
            <div className="acts">
              <button className="sbtn go" name="status" value="published">Publish</button>
              <button className="sbtn bad" name="status" value="dismissed">Dismiss</button>
              {r.status !== 'new' && <button className="sbtn" name="status" value="new">Reopen</button>}
            </div>
          </form>
        ))}
        {!data?.length && <p className="empty">No reports yet.</p>}
      </div>
    </>
  )
}
