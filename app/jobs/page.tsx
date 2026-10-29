import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav, Footer } from '@/components/site/Chrome'
import { BRIEF_BRANCHES } from '@/content/site'
import { checkedLabel, liveJobs } from '@/lib/server/publicData'
import { isFeatured } from '@/lib/server/db'

export const metadata: Metadata = {
  title: 'Verified fresher jobs · TierBridge',
  description: 'Fresher and internship roles for engineering students in India, each linked to the company’s own careers page.',
}
export const revalidate = 600

export default async function Jobs({ searchParams }: { searchParams: { branch?: string } }) {
  const branch = BRIEF_BRANCHES.find(b => b === searchParams.branch)
  const jobs = await liveJobs(branch)

  return (
    <>
      <Nav />
      <section className="page">
        <div className="in">
          <div className="head">
            <span className="eyebrow">Verified jobs</span>
            <h1>Fresher roles, checked daily</h1>
            <p>Every role links to the employer&apos;s own careers page. We re-check each one every morning and remove it when it closes. You never pay to apply.</p>
          </div>
          <nav className="chiprow" aria-label="Filter by branch">
            <Link className="chip" aria-pressed={!branch} href="/jobs">All</Link>
            {BRIEF_BRANCHES.map(b => (
              <Link key={b} className="chip" aria-pressed={branch === b} href={`/jobs?branch=${b}`}>{b === 'CSE' ? 'CSE / IT' : b}</Link>
            ))}
          </nav>
          {!jobs?.length ? (
            <div className="empty">No live roles {branch ? `for ${branch} ` : ''}right now. New roles are added every morning, and the daily brief sends the best ones straight to your inbox.</div>
          ) : (
            <div className="joblist">
              {jobs.map(j => (
                <article key={j.id} className={`job${isFeatured(j) ? ' featured' : ''}`}>
                  <div className="jtop">
                    <div><h3>{j.title}</h3><div className="jmeta">{j.company} · {j.location || 'India'}</div></div>
                    {isFeatured(j) && <span className="badge feat">Featured</span>}
                  </div>
                  <div className="tags">
                    {j.tags.map(t => <span className="tag" key={t}>{t}</span>)}
                    {j.branches.map(b => <span className="tag" key={b}>{b}</span>)}
                  </div>
                  <span className="badge ver" style={{ justifySelf: 'start' }}>✓ Verified · checked {checkedLabel(j.last_checked)}</span>
                  <div className="jfoot">
                    <span className="sal">{j.salary ?? ''}</span>
                    <a className="apply" href={`/go?k=job&i=${j.id}`} rel="nofollow">Apply on official site →</a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  )
}
