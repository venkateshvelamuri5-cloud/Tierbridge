import { NextRequest, NextResponse } from 'next/server'
import { unsubscribe } from '@/lib/server/unsubscribe'

// One-click unsubscribe (RFC 8058) used by Gmail and other mail apps.
export async function POST(req: NextRequest) {
  await unsubscribe(req.nextUrl.searchParams.get('t'))
  return NextResponse.json({ ok: true })
}
