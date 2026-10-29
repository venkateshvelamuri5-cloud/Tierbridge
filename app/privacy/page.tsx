import type { Metadata } from 'next'
import { Nav, Footer } from '@/components/site/Chrome'

export const metadata: Metadata = { title: 'Privacy · TierBridge' }

export default function Privacy() {
  return (
    <>
      <Nav />
      <section className="band">
        <div className="in legal">
          <span className="eyebrow">Privacy</span>
          <h1>How TierBridge handles your data</h1>
          <p>TierBridge sends a free daily career brief to engineering students in India. This page explains what we collect and why.</p>

          <h2>What we collect</h2>
          <ul>
            <li>Your email address and branch, when you join the brief.</li>
            <li>Basic, anonymous usage data such as which links in the brief get clicked, so we can improve it.</li>
          </ul>

          <h2>What we never do</h2>
          <ul>
            <li>We never sell your data or share your contact details with employers without asking you first.</li>
            <li>We never ask you to pay to apply for a job.</li>
          </ul>

          <h2>Who helps us run it</h2>
          <p>Your email and branch are stored with Supabase and the brief is sent through Resend. Briefs are written with help from Anthropic&apos;s Claude, which never sees your email address.</p>

          <h2>Affiliate links</h2>
          <p>Some course and book links in the brief are affiliate links, always labelled. If you buy through one, TierBridge earns a small commission at no extra cost to you. The free resource is always listed first.</p>

          <h2>Your choices</h2>
          <p>Every email has an unsubscribe link. To delete your data, email privacy@tierbridge.in and we will remove it.</p>
        </div>
      </section>
      <Footer />
    </>
  )
}
