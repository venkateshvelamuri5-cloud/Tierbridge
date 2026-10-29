'use client'
import { useState } from 'react'

export default function ReportForm() {
  const [status, setStatus] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'err'; message?: string }>({ kind: 'idle' })

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setStatus({ kind: 'sending' })
    const body = Object.fromEntries(new FormData(form))
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        form.reset()
        setStatus({ kind: 'ok', message: 'Thank you. We review every report and warn students in the brief when we confirm a scam.' })
      } else {
        setStatus({ kind: 'err', message: data.error || 'Something went wrong. Please try again.' })
      }
    } catch {
      setStatus({ kind: 'err', message: 'Could not reach TierBridge. Check your connection and try again.' })
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>What happened?
        <textarea name="description" required minLength={20} maxLength={3000} placeholder="For example: a WhatsApp message offering a job at a big company asked me to pay ₹2,500 for a laptop kit." />
      </label>
      <label>Link to the message, post or website (optional)
        <input name="url" type="url" placeholder="https://" maxLength={1000} />
      </label>
      <label>Your email, if we may follow up (optional)
        <input name="email" type="email" maxLength={254} autoComplete="email" />
      </label>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="btn primary" type="submit" disabled={status.kind === 'sending'}>{status.kind === 'sending' ? 'Sending…' : 'Send report'}</button>
      {status.message && <p className={`formmsg ${status.kind}`} role="status">{status.message}</p>}
    </form>
  )
}
