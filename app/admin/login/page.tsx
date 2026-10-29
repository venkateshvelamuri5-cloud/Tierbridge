import type { Metadata } from 'next'
import { Logo } from '@/components/site/Chrome'
import { login } from '../actions'

export const metadata: Metadata = { title: 'Admin · TierBridge', robots: { index: false } }

export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="page">
      <div className="in" style={{ maxWidth: 420 }}>
        <form action={login} className="form box">
          <span className="logo"><Logo />TierBridge admin</span>
          {searchParams.error && <p className="notice err">That email and password don&apos;t match.</p>}
          <label>Email<input name="email" type="email" autoComplete="username" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="btn primary" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  )
}
