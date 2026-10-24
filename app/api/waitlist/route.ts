import { NextRequest, NextResponse } from 'next/server'
import { BRANCHES, type Branch } from '@/content/site'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const branch = body?.branch as Branch

  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!BRANCHES.includes(branch)) {
    return NextResponse.json({ error: 'Please choose your branch.' }, { status: 400 })
  }

  const db = supabaseAdmin()
  if (!db) {
    console.error('Waitlist: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Signups are not open yet. Please try again soon.' }, { status: 503 })
  }

  // Re-signing up updates the branch and resubscribes, so the response never reveals whether an email exists.
  const { error } = await db
    .from('waitlist')
    .upsert({ email, branch, source: 'website', status: 'active', unsubscribed_at: null }, { onConflict: 'email' })

  if (error) {
    console.error('Waitlist insert failed:', error.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
