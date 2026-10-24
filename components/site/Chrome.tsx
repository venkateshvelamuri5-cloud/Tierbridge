import Link from 'next/link'

export function Check() {
  return (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M4 9.5l3 3 7-7" stroke="#6fe0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 24 C10 9, 22 9, 29 24" stroke="#ffb23f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3 24h26" stroke="#7fd6e8" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9.5 24v-7M16 24v-9.6M22.5 24v-7" stroke="#eef1f7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Nav() {
  return (
    <header className="nav">
      <div className="in">
        <Link className="logo" href="/#top" aria-label="TierBridge home"><Logo />TierBridge</Link>
        <ul>
          <li><a href="/#brief">Daily brief</a></li>
          <li><a href="/#jobs">Verified jobs</a></li>
          <li><a href="/#learn">Learn</a></li>
          <li><a href="/#partners">Employers</a></li>
          <li><a href="/#pricing">Pricing</a></li>
        </ul>
        <a className="btn primary" href="/#top">Get the brief</a>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer>
      <div className="in">
        <span>© {new Date().getFullYear()} TierBridge · Made for engineering students in India</span>
        <nav>
          <a href="/#brief">Daily brief</a>
          <a href="/#jobs">Jobs</a>
          <a href="/#partners">Employers</a>
          <a href="/#pricing">Pricing</a>
          <Link href="/privacy">Privacy</Link>
          <a href="mailto:report@tierbridge.in">Report a scam</a>
        </nav>
      </div>
    </footer>
  )
}
