import type { BriefBundle } from '@/lib/server/email'

// Web version of a sent brief, for the public archive.
export default function BriefView({ bundle }: { bundle: BriefBundle }) {
  const { brief: b, jobs, offer, sponsor } = bundle
  const go = (k: string, i: number | string) => `/go?b=${b.id}&k=${k}&i=${i}`
  return (
    <article className="brief">
      <p>{b.intro}</p>
      <section>
        <span className="eyebrow">Today&apos;s 5-minute skill</span>
        <h2>{b.skill.title}</h2>
        <p>{b.skill.detail}</p>
        {b.skill.resource_url && <p>Free resource: <a href={go('skill', 0)} rel="nofollow">{b.skill.resource_name}</a></p>}
        {offer && <p className="fine">Go deeper: <a href={go('affiliate', offer.id)} rel="sponsored nofollow">{offer.title}</a>{offer.price_note ? ` (${offer.price_note})` : ''}. Affiliate link: we may earn a small commission at no cost to you.</p>}
      </section>
      {b.news.length > 0 && (
        <section>
          <span className="eyebrow">News that matters</span>
          {b.news.map((n, i) => (
            <div key={n.url}><h3><a href={go('news', i)} rel="nofollow">{n.title}</a></h3><p>{n.why} <span className="mono muted">{n.source}</span></p></div>
          ))}
        </section>
      )}
      {jobs.length > 0 && (
        <section>
          <span className="eyebrow">Verified jobs</span>
          {jobs.map(j => (
            <div key={j.id}><h3><a href={go('job', j.id)} rel="nofollow">{j.title}</a></h3><p>{j.company} · {j.location || 'India'}</p></div>
          ))}
        </section>
      )}
      {sponsor && (
        <section className="box">
          <span className="eyebrow">Sponsor</span>
          <p><b>{sponsor.name}:</b> {sponsor.message} <a href={go('sponsor', sponsor.id)} rel="sponsored nofollow">Learn more</a></p>
        </section>
      )}
      {b.scam_note && (
        <section>
          <span className="eyebrow">Scam watch</span>
          <p>{b.scam_note} Real employers never ask you to pay. <a href="/report">Report a scam</a></p>
        </section>
      )}
    </article>
  )
}
