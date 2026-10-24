import { NextRequest, NextResponse } from 'next/server'
import { isCron } from '@/lib/server/cron'
import { sendToday } from '@/lib/server/pipeline/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!isCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await sendToday().catch(e => ({ error: e instanceof Error ? e.message : String(e) }))
  console.log('Send run', JSON.stringify(result))
  return NextResponse.json(result, { status: 'error' in result ? 500 : 200 })
}
