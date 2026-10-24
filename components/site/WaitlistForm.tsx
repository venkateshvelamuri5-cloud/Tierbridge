'use client'
import { useState } from 'react'
import { BRANCHES, type Branch } from '@/content/site'

type Status = { kind: 'idle' | 'sending' } | { kind: 'ok' | 'err'; message: string }

export default function WaitlistForm({ branch, onBranchChange }: { branch: Branch; onBranchChange: (b: Branch) => void }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, branch }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus({ kind: 'ok', message: `You're on the list. Your first ${branch} brief is on its way soon.` })
        setEmail('')
      } else {
        setStatus({ kind: 'err', message: data.error || 'Something went wrong. Please try again.' })
      }
    } catch {
      setStatus({ kind: 'err', message: 'Could not reach TierBridge. Check your connection and try again.' })
    }
  }

  return (
    <form className="signup" onSubmit={submit}>
      <label htmlFor="email" hidden>Email</label>
      <input id="email" type="email" placeholder="you@college.edu" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="branch" hidden>Branch</label>
      <select id="branch" value={branch} onChange={e => onBranchChange(e.target.value as Branch)}>
        {BRANCHES.map(b => <option key={b}>{b}</option>)}
      </select>
      <button className="btn primary" type="submit" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Adding you…' : "Get tomorrow's brief"}
      </button>
      {(status.kind === 'ok' || status.kind === 'err') && (
        <p className={`formmsg ${status.kind}`} role="status">{status.message}</p>
      )}
    </form>
  )
}
