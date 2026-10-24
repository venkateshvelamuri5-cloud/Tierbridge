import { BRIEF_BRANCHES } from '@/content/site'
import { db, istDate, type SponsorRow } from '@/lib/server/db'
import Notice from '@/components/admin/Notice'
import { addSponsor, toggleSponsor } from '../../actions'

export default async function Sponsors({ searchParams }: { searchParams: { msg?: string } }) {
  const sb = db()
  const [{ data }, { data: clicks }] = await Promise.all([
    sb.from('sponsors').select('*').order('starts_on', { ascending: false }),
    sb.from('clicks').select('target').eq('kind', 'sponsor'),
  ])
  const sponsors = (data ?? []) as SponsorRow[]
  const today = istDate()
  return (
    <>
      <h1>Sponsors</h1>
      <Notice msg={searchParams.msg} />
      <p className="muted">A booked sponsor appears in every brief for its branch between the start and end dates. Click counts help you report results back to them.</p>
      <div className="scroll">
        <table className="tbl">
          <thead><tr><th>Sponsor</th><th>Branch</th><th>Dates</th><th>Clicks</th><th></th></tr></thead>
          <tbody>
            {sponsors.map(s => (
              <tr key={s.id}>
                <td><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a><div className="muted">{s.message}</div></td>
                <td>{s.branch}</td>
                <td>{s.starts_on} to {s.ends_on} {s.active && s.starts_on <= today && s.ends_on >= today && <span className="pill live">running</span>}</td>
                <td>{(clicks ?? []).filter(c => c.target === s.url).length}</td>
                <td><form action={toggleSponsor}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="active" value={String(!s.active)} /><button className="sbtn">{s.active ? 'Pause' : 'Resume'}</button></form></td>
              </tr>
            ))}
            {!sponsors.length && <tr><td colSpan={5} className="muted">No sponsors yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={addSponsor} className="form box">
        <h2>Book a sponsor</h2>
        <label>Name<input name="name" required /></label>
        <label>Message, one or two sentences<textarea name="message" required maxLength={300} style={{ minHeight: 80 }} /></label>
        <label>Link<input name="url" type="url" required placeholder="https://" /></label>
        <label>Branch<select name="branch">{BRIEF_BRANCHES.map(b => <option key={b}>{b}</option>)}<option value="ALL">All branches</option></select></label>
        <label>Starts<input name="starts_on" type="date" required defaultValue={today} /></label>
        <label>Ends<input name="ends_on" type="date" required /></label>
        <button className="btn primary" type="submit">Book sponsor</button>
      </form>
    </>
  )
}
