'use client'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import {
  BRANCHES, BRIEF_BRANCHES, BRIEFS, FAQ, JOBS, PATHS, PLAN_FEATURES,
  briefBranch, type Branch, type Job,
} from '@/content/site'
import WaitlistForm from './WaitlistForm'
import { Nav, Footer, Check } from './Chrome'

const BridgeScene = dynamic(() => import('./BridgeScene'), { ssr: false })

type Part = 'skill' | 'news' | 'jobs' | 'sponsor' | 'scam'
const PARTS: { id: Part; title: string; detail: string }[] = [
  { id: 'skill', title: 'A 5-minute skill', detail: 'One tool or concept, with a free official resource to try it.' },
  { id: 'news', title: '3 things that matter', detail: 'News explained for your branch, always linked to the real source.' },
  { id: 'jobs', title: 'Verified jobs', detail: "Fresher roles we've traced to the company's own careers page." },
  { id: 'sponsor', title: 'One sponsor, clearly marked', detail: 'A single relevant course or tool. This keeps the brief free.' },
  { id: 'scam', title: 'Scam watch', detail: 'Fake posts other students reported this week.' },
]

function Chips<T extends string>({ items, selected, onPick, label }: { items: readonly T[]; selected: T; onPick: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {items.map(v => (
        <button key={v} type="button" className="chip" aria-pressed={v === selected} onClick={() => onPick(v)}>{v}</button>
      ))}
    </div>
  )
}

function useReveal() {
  useEffect(() => {
    document.documentElement.classList.add('js')
    const els = Array.from(document.querySelectorAll('.reveal'))
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('on')); return }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target) }
    }), { rootMargin: '0px 0px -8% 0px' })
    els.forEach(e => io.observe(e))
    const fallback = setTimeout(() => els.forEach(e => e.classList.add('on')), 2500)
    return () => { io.disconnect(); clearTimeout(fallback) }
  }, [])
}

export default function Home({ liveJobs }: { liveJobs?: Job[] }) {
  const [branch, setBranch] = useState<Branch>('ECE')
  const [part, setPart] = useState<Part>('skill')
  const [jobFilter, setJobFilter] = useState<'All' | Branch>('All')
  const [yearly, setYearly] = useState(false)
  const mailRef = useRef<HTMLDivElement>(null)
  useReveal()

  const bb = briefBranch(branch)
  const brief = BRIEFS[bb]
  const mailJobs = [...JOBS.filter(j => j.branch === bb), ...JOBS.filter(j => j.branch !== bb)].slice(0, 3)
  const isLive = !!liveJobs?.length
  const jobs = (isLive ? liveJobs! : JOBS).filter(j => jobFilter === 'All' || j.branch === jobFilter)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))

  const focusPart = (p: Part) => {
    setPart(p)
    const box = mailRef.current
    const target = box?.querySelector<HTMLElement>(`[data-p="${p}"]`)
    if (box && target) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      box.scrollTo({ top: target.offsetTop - box.offsetTop - 8, behavior: smooth ? 'smooth' : 'auto' })
    }
  }

  return (
    <>
      <Nav />

      <section className="hero" id="top">
        <div className="hero-fallback" />
        <BridgeScene branch={branch} />
        <div className="in">
          <div>
            <span className="eyebrow">For engineering students in India</span>
            <h1 style={{ marginTop: 16 }}>Your branch.<br />Verified jobs.<br /><span className="hl">Every morning.</span></h1>
            <p className="lead">A free 3-minute brief that teaches you one skill a day, explains the tech news that matters to your branch, and lists jobs we&apos;ve actually checked.</p>
            <WaitlistForm branch={branch} onBranchChange={setBranch} />
            <div className="trust">
              <span><Check />Free forever for students</span>
              <span><Check />No fees, ever</span>
              <span><Check />Email or WhatsApp</span>
            </div>
          </div>
          <div className="hero-side">
            <div className="branchpick">
              <span className="mono">Light up your branch</span>
              <Chips items={BRANCHES} selected={branch} onPick={setBranch} label="Choose your branch" />
            </div>
            <div className="ticker" aria-live="polite">
              <h4><span><span className="pulse" />&nbsp; Tomorrow in {branch}</span><span className="mono">Sample</span></h4>
              {brief.tick.map(([kind, title, detail]) => (
                <div className="tk" key={kind}>
                  <span className={`k ${kind}`}>{kind}</span>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="why">
        <div className="in">
          <div className="head reveal">
            <span className="eyebrow">Why TierBridge</span>
            <h2>Job sites are noisy, fake-prone and built for CSE.</h2>
            <p>We built the opposite: fewer, checked opportunities and a daily habit that actually teaches you something.</p>
          </div>
          <div className="probs">
            <div className="prob reveal">
              <div className="big">26,809</div>
              <h3>fake job scam cases</h3>
              <p>Reported by Telangana police between Jan 2024 and Aug 2025. Scammers harvest details from job portals, then reach graduates on WhatsApp.</p>
              <a className="src" href="https://www.etvbharat.com/en/state/cyber-gangs-exploit-job-market-telangana-police-warn-citizens-enn25102201235" target="_blank" rel="noopener noreferrer">Source: ETV Bharat, citing Telangana police</a>
            </div>
            <div className="prob reveal">
              <div className="big">42%</div>
              <h3>Civil placement vs 94% for CSE</h3>
              <p>Self-reported 2024-25 AICTE figures. Mechanical sits near 66%. Core branches need their own feed, not a filtered software list.</p>
              <a className="src" href="https://news.allen.in/aicte-report-2025-15-increase-in-engineering-employment/" target="_blank" rel="noopener noreferrer">Source: AICTE data via ALLEN News</a>
            </div>
            <div className="prob answer reveal">
              <div className="big">3 min</div>
              <h3>a day, built for your branch</h3>
              <p>One skill, three news items that matter to you, and jobs traced to official careers pages. Read it on the bus.</p>
              <span className="src">TierBridge daily brief</span>
            </div>
          </div>
        </div>
      </section>

      <section className="band alt" id="brief">
        <div className="in demo">
          <div>
            <div className="head reveal" style={{ marginBottom: 28 }}>
              <span className="eyebrow">The daily brief</span>
              <h2>Five parts. Three minutes. Every weekday at 7.</h2>
              <p>Tap a part to see it in the email. Switch branches and the whole brief changes.</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Chips items={BRIEF_BRANCHES} selected={bb} onPick={setBranch} label="Preview a branch" />
            </div>
            <div className="anatomy">
              {PARTS.map((p, i) => (
                <button key={p.id} type="button" aria-pressed={part === p.id} onClick={() => focusPart(p.id)}>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <strong>{p.title}</strong>
                  <span className="d">{p.detail}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="phonewrap reveal">
            <div className="phone">
              <div className="screen">
                <div className="sbar"><span>7:00</span><span>●●● 5G</span></div>
                <div className="mailtop">
                  <span className="from">TierBridge · {branch} brief</span>
                  <strong>{brief.subject}</strong>
                </div>
                <div className="mailbody" ref={mailRef}>
                  <div className={`mb${part === 'skill' ? ' focus' : ''}`} data-p="skill">
                    <h5>Today&apos;s 5-minute skill</h5>
                    <div className="mskill"><b>{brief.skill[0]}</b><span>{brief.skill[1]}</span></div>
                  </div>
                  <div className={`mb${part === 'news' ? ' focus' : ''}`} data-p="news">
                    <h5>3 things that matter</h5>
                    {brief.news.map(([h, why]) => (
                      <div className="mnews" key={h}><b>{h}</b><span>{why} Source →</span></div>
                    ))}
                  </div>
                  <div className={`mb${part === 'jobs' ? ' focus' : ''}`} data-p="jobs">
                    <h5>Verified jobs</h5>
                    {mailJobs.map(j => (
                      <div className="mjob" key={j.title}>
                        <div><b>{j.title}</b><span>{j.location} · {j.salary}</span></div>
                        <span className="mver">✓ Verified</span>
                      </div>
                    ))}
                  </div>
                  <div className={`mb${part === 'sponsor' ? ' focus' : ''}`} data-p="sponsor">
                    <h5>Sponsor</h5>
                    <div className="msp">{brief.sponsor}</div>
                  </div>
                  <div className={`mb${part === 'scam' ? ' focus' : ''}`} data-p="scam">
                    <h5>Scam watch</h5>
                    <div className="mscam">Students reported a &quot;₹2,500 onboarding kit&quot; message using a big company&apos;s name. Real employers never charge you.</div>
                  </div>
                </div>
              </div>
            </div>
            <span className="mono">Sample email · content changes per branch</span>
          </div>
        </div>
      </section>

      <section className="band" id="jobs">
        <div className="in">
          <div className="head reveal">
            <span className="eyebrow">Verified jobs</span>
            <h2>Fewer listings. Every one checked.</h2>
            <p>No reposted spam and no &quot;pay to apply&quot;. Each role links to the employer&apos;s official careers page and shows when we last checked it.</p>
          </div>
          <div className="jobtools">
            <Chips items={['All', 'ECE', 'MECH', 'CIVIL', 'CSE', 'IT', 'MCA'] as const} selected={jobFilter as 'All'} onPick={v => setJobFilter(v as 'All' | Branch)} label="Filter jobs by branch" />
            <span className="mono muted">{isLive ? <>{jobs.length} live roles · <a href="/jobs">see all</a></> : `${jobs.length} sample roles · live listings start with the first brief`}</span>
          </div>
          <div className="joblist">
            {jobs.map(j => (
              <article key={j.href ?? j.title} className={`job${j.featured ? ' featured' : ''}`}>
                <div className="jtop">
                  <div><h3>{j.title}</h3><div className="jmeta">{j.company} · {j.location}</div></div>
                  {j.featured && <span className="badge feat">Featured</span>}
                </div>
                <div className="tags">
                  {j.tags.map(t => <span className="tag" key={t}>{t}</span>)}
                  <span className="tag">{j.branch}</span>
                </div>
                <span className="badge ver" style={{ justifySelf: 'start' }}>✓ Verified · checked {j.checked}</span>
                <div className="jfoot"><span className="sal">{j.salary}</span>{j.href ? <a className="apply" href={j.href} rel="nofollow">Apply on official site →</a> : <span className="muted">Apply on official site →</span>}</div>
              </article>
            ))}
          </div>
          <div className="verify">
            <div className="vstep reveal"><span className="mono">Step 1</span><h4>Traced to source</h4><p>We only list roles we can find on the company&apos;s own careers page or from a confirmed recruiter.</p></div>
            <div className="vstep reveal"><span className="mono">Step 2</span><h4>Re-checked before sending</h4><p>Closed or edited roles drop out. Every card shows when it was last checked.</p></div>
            <div className="vstep reveal"><span className="mono">Step 3</span><h4>Zero-fee rule</h4><p>Any employer that asks candidates for money is removed and named in Scam watch.</p></div>
          </div>
        </div>
      </section>

      <section className="band alt" id="learn">
        <div className="in learn">
          <div>
            <div className="head reveal" style={{ marginBottom: 28 }}>
              <span className="eyebrow">Learn</span>
              <h2>Daily skills that add up to a semester path.</h2>
              <p>Each week has one theme for your branch, using free official resources first. Finish the path and you have something real on your resume.</p>
            </div>
            <div className="path">
              {PATHS[bb].map((t, i) => {
                const state = i < 2 ? 'done' : i === 2 ? 'now' : ''
                return (
                  <div className={`wk ${state}`} key={t}>
                    <span className="dot">{i < 2 ? '✓' : String(i + 1).padStart(2, '0')}</span>
                    <div><strong>{t}</strong><div className="s">{i === 5 ? 'Build and share it' : '5 short lessons · free resources'}</div></div>
                    <span className="st">{i < 2 ? 'Done' : i === 2 ? 'This week' : `Week ${i + 1}`}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="streak reveal">
            <span className="eyebrow">Your progress · sample</span>
            <h3>Keep the streak going</h3>
            <div className="grid7" aria-label="Sample six-week activity grid">
              {Array.from({ length: 84 }, (_, i) => {
                const lv = i < 50 ? [0, 1, 2, 3, 2, 3, 3][(i * 5 + 3) % 7] : 0
                return <i key={i} className={lv ? `l${lv}` : ''} />
              })}
            </div>
            <div className="stats"><div><b>12</b><span>day streak</span></div><div><b>27</b><span>skills tried</span></div><div><b>2/6</b><span>weeks done</span></div></div>
            <p className="muted" style={{ fontSize: 15 }}>Pro adds company interview playbooks, alerts when a chosen company posts a verified job, and salary ranges by role and city.</p>
          </div>
        </div>
      </section>

      <section className="band" id="partners">
        <div className="in">
          <div className="head reveal">
            <span className="eyebrow">Work with us</span>
            <h2>Reach students in the exact branch you hire from.</h2>
            <p>Every brief goes to one branch, so your role or course lands in front of the people it&apos;s for.</p>
          </div>
          <div className="aud">
            <div className="card reveal"><span className="eyebrow">Employers</span><h3>Post a verified job</h3><ul><li>Free while the board grows</li><li>Featured slot: top of the site and the branch email for 7 days</li><li>Applications go to your own careers page</li></ul><a className="btn ghost" href="mailto:partners@tierbridge.in">Post a job</a></div>
            <div className="card reveal"><span className="eyebrow">Sponsors</span><h3>Sponsor a branch brief</h3><ul><li>One sponsor per email, clearly labelled</li><li>Pick the branch: ECE, MECH, CIVIL, CSE and more</li><li>Open and click reports after every run</li></ul><a className="btn ghost" href="mailto:partners@tierbridge.in">Book a slot</a></div>
            <div className="card reveal"><span className="eyebrow">Colleges</span><h3>For placement cells</h3><ul><li>A dashboard of your batch&apos;s skills and gaps</li><li>Verified jobs matched to your students</li><li>A brief branded with your college name</li></ul><a className="btn ghost" href="mailto:partners@tierbridge.in">Talk to us</a></div>
          </div>
        </div>
      </section>

      <section className="band alt" id="pricing">
        <div className="in">
          <div className="head reveal">
            <span className="eyebrow">Pricing</span>
            <h2>Free for students. Pro when placements get serious.</h2>
          </div>
          <div className="toggle" role="group" aria-label="Billing period">
            <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
            <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly · 2 months free</button>
          </div>
          <div className="plans">
            <div className="plan reveal"><h3>Free</h3><p className="who">Every student, every branch</p><div className="price">₹0</div><ul>{PLAN_FEATURES.free.map(f => <li key={f}><Check /><span>{f}</span></li>)}</ul><a className="btn ghost" href="#top">Get the brief</a></div>
            <div className="plan pop reveal"><h3>Pro</h3><p className="who">Final-year students in placement season</p><div className="price">{yearly ? '₹799' : '₹99'}<small>{yearly ? ' / year' : ' / month'}</small></div><ul>{PLAN_FEATURES.pro.map(f => <li key={f}><Check /><span>{f}</span></li>)}</ul><a className="btn primary" href="#top">Join the waitlist</a></div>
            <div className="plan reveal"><h3>College</h3><p className="who">Placement cells and TPOs</p><div className="price" style={{ fontSize: 30, lineHeight: 1.2 }}>Per student, per year</div><ul>{PLAN_FEATURES.college.map(f => <li key={f}><Check /><span>{f}</span></li>)}</ul><a className="btn ghost" href="mailto:partners@tierbridge.in">Talk to us</a></div>
          </div>
          <p className="fine">One-click cancel. A reminder before every renewal. Prices in rupees including GST.</p>
        </div>
      </section>

      <section className="band" id="faq">
        <div className="in">
          <div className="head reveal"><span className="eyebrow">Questions</span><h2>Before you sign up</h2></div>
          <div className="faq">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="band alt">
        <div className="in final reveal">
          <span className="eyebrow">Start tomorrow</span>
          <h2>One email. Your branch. Real opportunities.</h2>
          <a className="btn primary" href="#top">Get tomorrow&apos;s brief</a>
        </div>
      </section>

      <Footer />
    </>
  )
}
