import { BRIEF_BRANCHES } from '@/content/site'
import { db, isFeatured, type JobRow } from '@/lib/server/db'
import Notice from '@/components/admin/Notice'
import { addJob, addSource, featureJob, setJobStatus, toggleSource } from '../../actions'

function JobTable({ jobs, mode }: { jobs: JobRow[]; mode: 'pending' | 'live' }) {
  return (
    <div className="scroll">
      <table className="tbl">
        <thead><tr><th>Role</th><th>Branches</th><th>Found</th><th></th></tr></thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id}>
              <td><a href={j.url} target="_blank" rel="noreferrer">{j.title}</a><div className="muted">{j.company} · {j.location}</div>{j.tags.length > 0 && <div className="muted mono">{j.tags.join(', ')}</div>}</td>
              <td>{j.branches.join(', ')}</td>
              <td>{new Date(j.first_seen).toLocaleDateString('en-IN')}</td>
              <td>
                <div className="acts">
                  {mode === 'pending' ? (
                    <>
                      <form action={setJobStatus}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="live" /><button className="sbtn go">Approve</button></form>
                      <form action={setJobStatus}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="rejected" /><button className="sbtn bad">Reject</button></form>
                    </>
                  ) : (
                    <>
                      <form action={featureJob}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="days" value={isFeatured(j) ? '0' : '7'} /><button className="sbtn">{isFeatured(j) ? 'Unfeature' : 'Feature 7 days'}</button></form>
                      <form action={setJobStatus}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="closed" /><button className="sbtn bad">Close</button></form>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!jobs.length && <tr><td colSpan={4} className="muted">{mode === 'pending' ? 'Nothing waiting for review.' : 'No live jobs yet.'}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default async function Jobs({ searchParams }: { searchParams: { msg?: string } }) {
  const sb = db()
  const [pending, live, sources] = await Promise.all([
    sb.from('jobs').select('*').eq('status', 'pending').order('first_seen', { ascending: false }).limit(200),
    sb.from('jobs').select('*').eq('status', 'live').order('first_seen', { ascending: false }).limit(200),
    sb.from('job_sources').select('*').order('company'),
  ])
  return (
    <>
      <h1>Jobs</h1>
      <Notice msg={searchParams.msg} />
      <p className="muted">New fresher roles from your sources land here every morning. {process.env.AUTO_APPROVE_JOBS === 'true' ? 'AUTO_APPROVE_JOBS is on, so they go live straight away.' : 'Approve them to make them live on the site and in briefs.'} Roles that disappear from the company board close automatically.</p>

      <section><h2 style={{ marginBottom: 12 }}>Waiting for review ({pending.data?.length ?? 0})</h2><JobTable jobs={(pending.data ?? []) as JobRow[]} mode="pending" /></section>
      <section><h2 style={{ marginBottom: 12 }}>Live ({live.data?.length ?? 0})</h2><JobTable jobs={(live.data ?? []) as JobRow[]} mode="live" /></section>

      <section className="grid2">
        <form action={addJob} className="form box" style={{ maxWidth: 'none' }}>
          <h2>Add a job by hand</h2>
          <label>Title<input name="title" required /></label>
          <label>Company<input name="company" required /></label>
          <label>Location<input name="location" placeholder="Bengaluru" /></label>
          <label>Official posting link<input name="url" type="url" required placeholder="https://careers.company.com/..." /></label>
          <label>Salary (optional)<input name="salary" placeholder="₹4–6 LPA" /></label>
          <label>Skill tags, comma separated<input name="tags" placeholder="Java, SQL" /></label>
          <div className="acts">{BRIEF_BRANCHES.map(b => <label key={b} style={{ display: 'flex', gap: 6, fontWeight: 400 }}><input type="checkbox" name="branches" value={b} style={{ width: 'auto' }} />{b}</label>)}</div>
          <button className="btn primary" type="submit">Add live job</button>
        </form>

        <div className="box" style={{ display: 'grid', gap: 14 }}>
          <h2>Job sources</h2>
          <p className="muted" style={{ fontSize: 14 }}>Public company job boards read every morning. The board name is the last part of the careers URL, for example <span className="mono">boards.greenhouse.io/<b>acme</b></span>, <span className="mono">jobs.lever.co/<b>acme</b></span> or <span className="mono">jobs.ashbyhq.com/<b>acme</b></span>.</p>
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Company</th><th>Board</th><th>Last run</th><th></th></tr></thead>
              <tbody>
                {(sources.data ?? []).map(s => (
                  <tr key={s.id}>
                    <td>{s.company}{s.last_error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{s.last_error}</div>}</td>
                    <td className="mono">{s.provider}/{s.board}</td>
                    <td>{s.last_run_at ? new Date(s.last_run_at).toLocaleDateString('en-IN') : 'never'}</td>
                    <td><form action={toggleSource}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="active" value={String(!s.active)} /><button className="sbtn">{s.active ? 'Pause' : 'Resume'}</button></form></td>
                  </tr>
                ))}
                {!sources.data?.length && <tr><td colSpan={4} className="muted">No sources yet. Add a few companies that hire freshers in India.</td></tr>}
              </tbody>
            </table>
          </div>
          <form action={addSource} className="form">
            <label>Provider<select name="provider"><option>greenhouse</option><option>lever</option><option>ashby</option></select></label>
            <label>Board name<input name="board" required pattern="[A-Za-z0-9._\-]+" /></label>
            <label>Company name<input name="company" required /></label>
            <button className="btn ghost" type="submit">Add source</button>
          </form>
        </div>
      </section>
    </>
  )
}
