import 'server-only'
import type { NextRequest } from 'next/server'

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export function isCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  return !!secret && secret.length >= 16 && req.headers.get('authorization') === `Bearer ${secret}`
}
