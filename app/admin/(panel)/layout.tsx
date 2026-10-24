import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/site/Chrome'
import { requireAdmin } from '@/lib/server/requireAdmin'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { logout } from '../actions'

export const metadata: Metadata = { title: 'Admin · TierBridge', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="admin">
      <aside>
        <Link className="logo" href="/admin"><Logo />Admin</Link>
        <Link href="/admin">Today</Link>
        <Link href="/admin/jobs">Jobs</Link>
        <Link href="/admin/offers">Affiliate offers</Link>
        <Link href="/admin/sponsors">Sponsors</Link>
        <Link href="/admin/reports">Scam reports</Link>
        <Link href="/" target="_blank">View site ↗</Link>
        <form action={logout}><button className="sbtn" type="submit">Sign out</button></form>
      </aside>
      <main>
        {supabaseAdmin() ? children : (
          <p className="notice err">The database isn&apos;t connected. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, run the two SQL files in supabase/migrations, then redeploy.</p>
        )}
      </main>
    </div>
  )
}
