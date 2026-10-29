import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  // Bots fill the hidden "website" field; pretend it worked.
  if (body?.website) return NextResponse.json({ ok: true })
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (description.length < 20 || description.length > 3000) {
    return NextResponse.json({ error: 'Please describe what happened in at least 20 characters.' }, { status: 400 })
  }
  if (url && (url.length > 1000 || !/^https?:\/\//.test(url))) {
    return NextResponse.json({ error: 'The link should start with http:// or https://.' }, { status: 400 })
  }
  if (email && (!EMAIL.test(email) || email.length > 254)) {
    return NextResponse.json({ error: 'Please enter a valid email, or leave it empty.' }, { status: 400 })
  }
  const sb = supabaseAdmin()
  if (!sb) return NextResponse.json({ error: 'Reports are not open yet. Please try again soon.' }, { status: 503 })
  const { error } = await sb.from('scam_reports').insert({ description, url: url || null, reporter_email: email || null })
  if (error) {
    console.error('Scam report insert failed:', error.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
