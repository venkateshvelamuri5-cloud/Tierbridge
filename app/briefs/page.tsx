import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav, Footer } from '@/components/site/Chrome'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

export const metadata: Metadata = { title: 'Past briefs · TierBridge' }
export const revalidate = 600

export default async function Briefs() {
  const sb = supabaseAdmin()
  const { data } = sb
    ? await sb.from('briefs').select('id, branch, brief_date, subject').eq('status', 'sent').order('brief_date', { ascending: false }).limit(60)
    : { data: [] }
  return (
    <>
      <Nav />
      <section className="page">
        <div className="in">
          <div className="head">
            <span className="eyebrow">Archive</span>
            <h1>Past briefs</h1>
            <p>Every brief we&apos;ve sent. Join from the home page to get the next one in your inbox at 7 AM.</p>
          </div>
          {!data?.length ? (
            <div className="empty">The first brief hasn&apos;t gone out yet. <Link href="/#top" style={{ color: 'var(--marigold)' }}>Join now</Link> to get it.</div>
          ) : (
            <div className="list">
              {data.map(b => (
                <Link key={b.id} className="row" href={`/briefs/${b.id}`}>
                  <strong>{b.subject}</strong>
                  <span className="mono muted">{b.branch} · {b.brief_date}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  )
}
