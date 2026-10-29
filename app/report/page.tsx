import type { Metadata } from 'next'
import { Nav, Footer } from '@/components/site/Chrome'
import ReportForm from './ReportForm'

export const metadata: Metadata = { title: 'Report a job scam · TierBridge' }

export default function Report() {
  return (
    <>
      <Nav />
      <section className="page">
        <div className="in">
          <div className="head">
            <span className="eyebrow">Scam watch</span>
            <h1>Report a job scam</h1>
            <p>Got a job offer that asks for money, an &quot;onboarding fee&quot;, or your bank details? Tell us. We check every report and warn other students in the daily brief.</p>
          </div>
          <ReportForm />
        </div>
      </section>
      <Footer />
    </>
  )
}
