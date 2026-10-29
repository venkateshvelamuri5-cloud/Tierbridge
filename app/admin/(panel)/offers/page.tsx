import { BRIEF_BRANCHES } from '@/content/site'
import { db, type OfferRow } from '@/lib/server/db'
import Notice from '@/components/admin/Notice'
import { addOffer, toggleOffer } from '../../actions'

export default async function Offers({ searchParams }: { searchParams: { msg?: string } }) {
  const sb = db()
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString()
  const [{ data }, { data: clicks }] = await Promise.all([
    sb.from('affiliate_offers').select('*').order('created_at', { ascending: false }),
    sb.from('clicks').select('target').eq('kind', 'affiliate').gte('created_at', monthAgo),
  ])
  const offers = (data ?? []) as OfferRow[]
  const clicksFor = (url: string) => (clicks ?? []).filter(c => c.target === url).length
  return (
    <>
      <h1>Affiliate offers</h1>
      <Notice msg={searchParams.msg} />
      <p className="muted">Each morning the brief matches today&apos;s skill tags against these offers and adds the best match, clearly labelled, under the free resource. Use your own affiliate links from each program&apos;s dashboard.</p>
      <div className="scroll">
        <table className="tbl">
          <thead><tr><th>Offer</th><th>Skill tags</th><th>Branches</th><th>Clicks, 30 days</th><th></th></tr></thead>
          <tbody>
            {offers.map(o => (
              <tr key={o.id}>
                <td><a href={o.url} target="_blank" rel="noreferrer">{o.title}</a><div className="muted">{o.program}{o.price_note ? ` · ${o.price_note}` : ''}</div></td>
                <td className="mono">{o.skill_tags.join(', ')}</td>
                <td>{o.branches.join(', ') || 'All'}</td>
                <td>{clicksFor(o.url)}</td>
                <td><form action={toggleOffer}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="active" value={String(!o.active)} /><button className="sbtn">{o.active ? 'Pause' : 'Resume'}</button></form></td>
              </tr>
            ))}
            {!offers.length && <tr><td colSpan={5} className="muted">No offers yet. Join Coursera, Udemy, Amazon Associates or similar, then add links here.</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={addOffer} className="form box">
        <h2>Add an offer</h2>
        <label>Program<input name="program" required placeholder="Coursera" /></label>
        <label>What students see<input name="title" required placeholder="Google Data Analytics certificate" /></label>
        <label>Your affiliate link<input name="url" type="url" required placeholder="https://" /></label>
        <label>Skill tags, comma separated<input name="skill_tags" required placeholder="python, data analysis, sql" /></label>
        <label>Price note (optional)<input name="price_note" placeholder="Free to audit" /></label>
        <div className="acts">{BRIEF_BRANCHES.map(b => <label key={b} style={{ display: 'flex', gap: 6, fontWeight: 400 }}><input type="checkbox" name="branches" value={b} style={{ width: 'auto' }} />{b}</label>)}</div>
        <p className="muted" style={{ fontSize: 14 }}>Leave all branches unticked to offer it to every branch.</p>
        <button className="btn primary" type="submit">Add offer</button>
      </form>
    </>
  )
}
