import type { Metadata } from 'next'
import { Nav, Footer } from '@/components/site/Chrome'
import { redirect } from 'next/navigation'
import { unsubscribe } from '@/lib/server/unsubscribe'

export const metadata: Metadata = { title: 'Unsubscribe · TierBridge', robots: { index: false } }
export const dynamic = 'force-dynamic'

// A button rather than unsubscribing on page load, so link scanners in mail apps can't unsubscribe people.
export default function Unsubscribe({ searchParams }: { searchParams: { t?: string; done?: string } }) {
  async function confirm(formData: FormData) {
    'use server'
    const ok = await unsubscribe(String(formData.get('t') ?? ''))
    redirect(`/unsubscribe?done=${ok ? '1' : '0'}`)
  }

  return (
    <>
      <Nav />
      <section className="page">
        <div className="in legal">
          <span className="eyebrow">Unsubscribe</span>
          {searchParams.done === '1' ? (
            <><h1>You&apos;re unsubscribed</h1><p>You won&apos;t get the daily brief any more. If you change your mind, join again from the home page.</p></>
          ) : searchParams.done === '0' ? (
            <><h1>That link didn&apos;t work</h1><p>It may be old or already used. Use the unsubscribe link in your latest brief, or email privacy@tierbridge.in and we&apos;ll remove you.</p></>
          ) : (
            <form action={confirm} className="form">
              <h1>Stop the daily brief?</h1>
              <p>You&apos;ll stop getting emails from TierBridge. You can join again any time.</p>
              <input type="hidden" name="t" value={searchParams.t ?? ''} />
              <button className="btn primary" type="submit">Unsubscribe</button>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </>
  )
}
